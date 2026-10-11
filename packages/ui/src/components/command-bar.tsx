"use client";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Dialog as Primitive } from "radix-ui";
import { cn } from "../utils";
import {
  CommandFooter,
  CommandInput,
  CommandMenuItem,
  CommandMenuSection,
  CommandShortcut,
} from "./command-primitives";

export interface CommandItem {
  id: string;
  label: string;
  supportingText?: string;
  keywords?: readonly string[];
  leading?: ReactNode;
  shortcut?: ReactNode;
  disabled?: boolean;
  onSelect?: () => void;
}
export interface CommandSection {
  id: string;
  label?: string;
  items: readonly CommandItem[];
}
export type CommandBarProps = Omit<ComponentProps<"div">, "children" | "onSelect"> & {
  sections: readonly CommandSection[];
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  activeId?: string;
  defaultActiveId?: string;
  onActiveIdChange?: (id: string) => void;
  onSelect?: (item: CommandItem) => void;
  textLayout?: "inline" | "stacked";
  size?: "sm" | "md";
  detail?: ReactNode | ((item: CommandItem | undefined) => ReactNode);
  empty?: ReactNode;
  footer?: boolean;
  help?: ReactNode;
  commandOnly?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  onSettings?: () => void;
  searchLabel?: string;
};
const normalize = (text: string): string =>
  text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
export function CommandBar({
  sections,
  query,
  defaultQuery = "",
  onQueryChange,
  activeId,
  defaultActiveId,
  onActiveIdChange,
  onSelect,
  textLayout = "inline",
  size = "sm",
  detail,
  empty = "No results found",
  footer = false,
  help,
  commandOnly = false,
  onBack,
  onClose,
  onSettings,
  searchLabel = "Search commands",
  className,
  ...props
}: CommandBarProps): React.ReactElement {
  const [internalQuery, setQuery] = useState(defaultQuery);
  const [internalActive, setActive] = useState(defaultActiveId);
  const currentQuery = query ?? internalQuery;
  const filtered = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        normalize([item.label, item.supportingText, ...(item.keywords ?? [])].join(" ")).includes(
          normalize(currentQuery.trim())
        )
      ),
    }))
    .filter((section) => section.items.length > 0);
  const available = filtered.flatMap((section) => section.items).filter((item) => !item.disabled);
  const requestedId = activeId ?? internalActive;
  const current = available.find((item) => item.id === requestedId) ?? available[0];
  const instanceId = useId();
  const listId = `${instanceId}-results`;
  const optionId = (id: string): string => `${instanceId}-option-${encodeURIComponent(id)}`;
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const changeActive = (id: string): void => {
    if (activeId === undefined) setActive(id);
    onActiveIdChange?.(id);
  };
  const currentOptionId = current ? optionId(current.id) : undefined;
  useEffect(() => {
    if (!currentOptionId) return;
    const option = document.getElementById(currentOptionId);
    let scroller = option?.parentElement;
    while (scroller && root.current?.contains(scroller)) {
      if (
        scroller.scrollHeight > scroller.clientHeight &&
        ["auto", "scroll"].includes(getComputedStyle(scroller).overflowY)
      ) {
        const bounds = scroller.getBoundingClientRect();
        const row = option?.getBoundingClientRect();
        if (row && row.bottom > bounds.bottom) scroller.scrollTop += row.bottom - bounds.bottom;
        else if (row && row.top < bounds.top) scroller.scrollTop -= bounds.top - row.top;
        break;
      }
      scroller = scroller.parentElement;
    }
  }, [currentOptionId, currentQuery]);
  const select = (item: CommandItem): void => {
    if (item.disabled) return;
    item.onSelect?.();
    onSelect?.(item);
  };
  return (
    <div
      {...props}
      ref={root}
      className={cn("p-command-bar", className)}
      data-text-layout={textLayout}
      data-detail={detail != null}
      data-command-only={commandOnly}
      data-footer={footer}
    >
      <CommandInput
        ref={input}
        value={currentQuery}
        onChange={(event) => {
          if (query === undefined) setQuery(event.target.value);
          onQueryChange?.(event.target.value);
        }}
        role="combobox"
        aria-label={searchLabel}
        aria-autocomplete="list"
        aria-expanded={!commandOnly}
        aria-controls={commandOnly ? undefined : listId}
        aria-activedescendant={commandOnly || !current ? undefined : optionId(current.id)}
        help={help ?? null}
        shortcut={help ? null : <CommandShortcut first="⌘/" />}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) && available.length) {
            const index = available.findIndex((item) => item.id === current?.id);
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? available.length - 1
                  : (index + (event.key === "ArrowDown" ? 1 : -1) + available.length) %
                    available.length;
            event.preventDefault();
            changeActive(available[next].id);
          } else if (event.key === "Enter" && current) {
            event.preventDefault();
            select(current);
          } else if (event.key === "Escape") onClose?.();
          else if (
            (event.key === "ArrowLeft" || event.key === "Backspace") &&
            !currentQuery &&
            onBack
          ) {
            event.preventDefault();
            onBack();
          }
        }}
      />
      {!commandOnly && (
        <div className="p-command-body">
          <div
            className="p-command-results"
            id={listId}
            role="listbox"
            aria-label="Command results"
          >
            {filtered.length ? (
              filtered.map((section) => (
                <CommandMenuSection
                  key={section.id}
                  size={size}
                  role="group"
                  aria-label={section.label ?? "Commands"}
                  label={section.label}
                >
                  {section.items.map((item) => (
                    <CommandMenuItem
                      key={item.id}
                      id={optionId(item.id)}
                      role="option"
                      aria-selected={current?.id === item.id}
                      aria-disabled={item.disabled}
                      tabIndex={-1}
                      label={item.label}
                      supportingText={item.supportingText}
                      leading={item.leading}
                      shortcut={item.shortcut}
                      size={size}
                      textLayout={textLayout}
                      active={current?.id === item.id}
                      disabled={item.disabled}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseMove={() => {
                        if (!item.disabled && current?.id !== item.id) changeActive(item.id);
                      }}
                      onClick={() => select(item)}
                    />
                  ))}
                </CommandMenuSection>
              ))
            ) : (
              <div className="p-command-empty" role="status">
                {empty}
              </div>
            )}
          </div>
          {detail != null && filtered.length > 0 && (
            <div className="p-command-detail">
              {typeof detail === "function" ? detail(current) : detail}
            </div>
          )}
        </div>
      )}
      {footer && !commandOnly && <CommandFooter onSettings={onSettings} onBack={onBack} />}
    </div>
  );
}
export type CommandDialogProps = CommandBarProps & {
  trigger: ReactNode;
  title?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  enableShortcut?: boolean;
  closeOnSelect?: boolean;
};
export function CommandDialog({
  trigger,
  title = "Command menu",
  open,
  defaultOpen = false,
  onOpenChange,
  enableShortcut = true,
  closeOnSelect = true,
  onSelect,
  ...props
}: CommandDialogProps): React.ReactElement {
  const [internalOpen, setOpen] = useState(defaultOpen);
  const visible = open ?? internalOpen;
  const changeOpen = useCallback(
    (value: boolean): void => {
      if (open === undefined) setOpen(value);
      onOpenChange?.(value);
    },
    [open, onOpenChange]
  );
  useEffect(() => {
    if (!enableShortcut) return;
    const shortcut = (event: KeyboardEvent): void => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k" &&
        !event.altKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        changeOpen(!visible);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [enableShortcut, visible, changeOpen]);
  return (
    <Primitive.Root open={visible} onOpenChange={changeOpen}>
      <Primitive.Trigger asChild>{trigger}</Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Overlay className="p-command-overlay" />
        <Primitive.Content
          className="p-command-dialog"
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            document.querySelector<HTMLInputElement>(".p-command-dialog input")?.focus();
          }}
        >
          <Primitive.Title className="p-sr-only">{title}</Primitive.Title>
          <CommandBar
            {...props}
            onClose={() => {
              props.onClose?.();
              changeOpen(false);
            }}
            onSelect={(item) => {
              onSelect?.(item);
              if (closeOnSelect) changeOpen(false);
            }}
          />
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
