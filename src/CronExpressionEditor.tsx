import { useEffect, useLayoutEffect, useRef } from "react";
import type { KeyboardEvent } from "react";

const months = "JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split(" ");
const weekdays = "SUN MON TUE WED THU FRI SAT".split(" ");

function supportsCharacters(value: string) {
  const fields = value.trim().split(/\s+/);
  const offset = fields.length === 6 ? 1 : 0;
  return fields.every((field, index) => {
    if (!/^[\d*,/a-z-]*$/i.test(field)) return false;
    const names =
      index === 3 + offset ? months : index === 4 + offset ? weekdays : [];
    return [...field.matchAll(/[a-z]+/gi)].every(([name]) =>
      names.some((allowed) => allowed.includes(name.toUpperCase())),
    );
  });
}

export function CronExpressionEditor({
  input,
  fields,
  activeField,
  onChange,
  onSelect,
  label,
}: {
  input: string;
  fields: readonly string[];
  activeField: number;
  onChange: (input: string) => void;
  onSelect: (index: number) => void;
  label: string;
}) {
  const editor = useRef<HTMLDivElement>(null);
  const previousSelection = useRef({ start: 0, end: 0 });
  const tokens = [...input.matchAll(/\S+/g)];

  useLayoutEffect(() => {
    if (editor.current && editor.current.textContent !== input)
      editor.current.textContent = input;
  }, [input]);

  useEffect(() => {
    function updateSelection() {
      const selection = window.getSelection();
      if (!selection?.rangeCount || !editor.current) return;
      const range = selection.getRangeAt(0);
      if (!editor.current.contains(range.startContainer)) return;
      const prefix = range.cloneRange();
      prefix.selectNodeContents(editor.current);
      prefix.setEnd(range.startContainer, range.startOffset);
      const caret = prefix.toString().length;
      previousSelection.current = {
        start: caret,
        end: caret + range.toString().length,
      };
      const index = tokens.findIndex(
        (token) => caret <= token.index + token[0].length,
      );
      onSelect(
        Math.max(
          0,
          Math.min(index < 0 ? tokens.length - 1 : index, fields.length - 1),
        ),
      );
    }
    document.addEventListener("selectionchange", updateSelection);
    return () =>
      document.removeEventListener("selectionchange", updateSelection);
  }, [input, fields.length, onSelect, tokens]);

  useEffect(() => {
    const element = editor.current!;
    function beforeInput(event: InputEvent) {
      if (!event.data) return;
      const range = window.getSelection()?.rangeCount
        ? window.getSelection()!.getRangeAt(0)
        : null;
      if (!range || !element.contains(range.commonAncestorContainer)) return;
      const prefix = range.cloneRange();
      prefix.selectNodeContents(element);
      prefix.setEnd(range.startContainer, range.startOffset);
      const start = prefix.toString().length;
      const end = start + range.toString().length;
      previousSelection.current = { start, end };
      const candidate = input.slice(0, start) + event.data + input.slice(end);
      if (!supportsCharacters(candidate)) event.preventDefault();
    }
    element.addEventListener("beforeinput", beforeInput);
    return () => element.removeEventListener("beforeinput", beforeInput);
  }, [input]);

  function selectField(index: number) {
    const element = editor.current!;
    element.focus();
    const token = tokens[index];
    if (element.firstChild && token) {
      const range = document.createRange();
      range.setStart(element.firstChild, token.index);
      range.setEnd(element.firstChild, token.index + token[0].length);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
    }
    onSelect(index);
  }

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.nativeEvent.isComposing) return;
    if (
      event.key.length === 1 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !/^[\d *,/a-z-]$/i.test(event.key)
    )
      event.preventDefault();
    if (event.key === "Enter") event.preventDefault();
    if (event.key !== "Tab") return;
    const next = activeField + (event.shiftKey ? -1 : 1);
    if (next < 0 || next >= tokens.length) return;
    event.preventDefault();
    selectField(next);
  }

  return (
    <div className="cron-editor">
      <div className="cron-editor-text">
        <div className="cron-token-overlay" aria-hidden="true">
          {input.split(/(\S+)/).map((part, index) => (
            <span
              key={index}
              className={
                index % 2 === 1 && (index - 1) / 2 === activeField
                  ? "cron-token-active"
                  : undefined
              }
            >
              {part}
            </span>
          ))}
        </div>
        <div
          ref={editor}
          className="cron-expression"
          role="textbox"
          aria-label={label}
          aria-multiline="false"
          aria-describedby="cron-help"
          contentEditable="plaintext-only"
          suppressContentEditableWarning
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          tabIndex={0}
          onInput={(event) => {
            const element = event.currentTarget;
            element.normalize();
            if (
              !event.nativeEvent.inputType?.startsWith("delete") &&
              !supportsCharacters(element.textContent)
            ) {
              element.textContent = input;
              if (element.firstChild) {
                const range = document.createRange();
                range.setStart(
                  element.firstChild,
                  Math.min(previousSelection.current.start, input.length),
                );
                range.setEnd(
                  element.firstChild,
                  Math.min(previousSelection.current.end, input.length),
                );
                window.getSelection()!.removeAllRanges();
                window.getSelection()!.addRange(range);
              }
              return;
            }
            onChange(element.textContent);
          }}
          onKeyDown={keyDown}
          onPaste={(event) => {
            event.preventDefault();
            const text = event.clipboardData
              .getData("text/plain")
              .replace(/[\r\n]+/g, " ");
            const element = event.currentTarget;
            const selection = window.getSelection()!;
            const range = selection.rangeCount
              ? selection.getRangeAt(0)
              : document.createRange();
            if (!element.contains(range.commonAncestorContainer)) {
              range.selectNodeContents(element);
              range.collapse(false);
            }
            const prefix = range.cloneRange();
            prefix.selectNodeContents(element);
            prefix.setEnd(range.startContainer, range.startOffset);
            const start = prefix.toString().length;
            const candidate =
              input.slice(0, start) +
              text +
              input.slice(start + range.toString().length);
            if (!supportsCharacters(candidate)) return;
            range.deleteContents();
            const node = document.createTextNode(text);
            range.insertNode(node);
            range.setStartAfter(node);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            element.normalize();
            onChange(element.textContent);
          }}
        />
      </div>
      <div className="cron-field-labels">
        {fields.map((field, index) => (
          <button
            key={field}
            type="button"
            tabIndex={-1}
            aria-pressed={activeField === index}
            onClick={() => selectField(index)}
          >
            {field}
          </button>
        ))}
      </div>
    </div>
  );
}
