/// <reference path="./conform-input.d.ts" />
/**
 * A Web Component that integrates with Conform for form validation.
 * Provides label, input, and error display.
 *
 * Usage in React 19:
 * <conform-input
 *   name={fields.email.name}
 *   id={fields.email.id}
 *   label="Email"
 *   errors={JSON.stringify(fields.email.errors)}
 * />
 */

// Only define and register in browser environment
if (typeof window !== "undefined" && typeof HTMLElement !== "undefined") {
  class ConformInput extends HTMLElement {
    static formAssociated = true;

    static get observedAttributes() {
      return ["name", "id", "label", "errors", "type", "placeholder", "required", "disabled", "value"];
    }

    private internals: ElementInternals;
    private shadow: ShadowRoot;
    private inputEl: HTMLInputElement | null = null;
    private labelEl: HTMLLabelElement | null = null;
    private errorEl: HTMLElement | null = null;

    constructor() {
      super();
      this.internals = this.attachInternals();
      this.shadow = this.attachShadow({ mode: "open" });
      this.render();
    }

    private render() {
      const label = this.getAttribute("label") || "";
      const name = this.getAttribute("name") || "";
      const id = this.getAttribute("id") || name;
      const type = this.getAttribute("type") || "text";
      const placeholder = this.getAttribute("placeholder") || "";
      const required = this.hasAttribute("required");
      const disabled = this.hasAttribute("disabled");
      const value = this.getAttribute("value") || "";
      const errorsAttr = this.getAttribute("errors");

      let errors: string[] = [];
      if (errorsAttr) {
        try {
          errors = JSON.parse(errorsAttr);
        } catch {
          errors = errorsAttr ? [errorsAttr] : [];
        }
      }

      this.shadow.innerHTML = `
        <style>
          :host {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            font-family: system-ui, -apple-system, sans-serif;
          }

          label {
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--label-color, #374151);
          }

          input {
            padding: 0.5rem 0.75rem;
            border: 1px solid var(--border-color, #d1d5db);
            border-radius: 6px;
            font-size: 1rem;
            background: var(--field-background, #fff);
            color: var(--field-text-color, #111827);
            outline: none;
            transition: border-color 0.15s, box-shadow 0.15s;
          }

          input:focus {
            border-color: var(--focus-color, #3b82f6);
            box-shadow: 0 0 0 2px var(--focus-ring-color, rgba(59, 130, 246, 0.3));
          }

          input[aria-invalid="true"] {
            border-color: var(--invalid-color, #ef4444);
          }

          input:disabled {
            background: var(--disabled-background, #f3f4f6);
            color: var(--disabled-color, #9ca3af);
            cursor: not-allowed;
          }

          .errors {
            display: flex;
            flex-direction: column;
            gap: 0.125rem;
          }

          .error {
            font-size: 0.75rem;
            color: var(--invalid-color, #ef4444);
          }

          .error:empty {
            display: none;
          }
        </style>

        <label for="${id}">${label}</label>
        <input
          type="${type}"
          name="${name}"
          id="${id}"
          placeholder="${placeholder}"
          ${required ? "required" : ""}
          ${disabled ? "disabled" : ""}
          value="${value}"
          aria-invalid="${errors.length > 0}"
          aria-describedby="${id}-errors"
        />
        <div class="errors" id="${id}-errors">
          ${errors.map((error) => `<span class="error">${error}</span>`).join("")}
        </div>
      `;

      this.inputEl = this.shadow.querySelector("input");
      this.labelEl = this.shadow.querySelector("label");
      this.errorEl = this.shadow.querySelector(".errors");

      this.inputEl?.addEventListener("input", this.handleInput.bind(this));
      this.inputEl?.addEventListener("change", this.handleChange.bind(this));
      this.inputEl?.addEventListener("blur", this.handleBlur.bind(this));
      this.inputEl?.addEventListener("keydown", this.handleKeydown.bind(this));
    }

    private handleInput(e: Event) {
      const input = e.target as HTMLInputElement;
      this.internals.setFormValue(input.value);
      this.dispatchEvent(
        new CustomEvent("conform-input", {
          bubbles: true,
          composed: true,
          detail: { value: input.value, name: this.getAttribute("name") },
        })
      );
    }

    private handleChange(e: Event) {
      const input = e.target as HTMLInputElement;
      this.dispatchEvent(
        new CustomEvent("conform-change", {
          bubbles: true,
          composed: true,
          detail: { value: input.value, name: this.getAttribute("name") },
        })
      );
    }

    private handleBlur() {
      this.dispatchEvent(
        new CustomEvent("conform-blur", {
          bubbles: true,
          composed: true,
          detail: { name: this.getAttribute("name") },
        })
      );
    }

    private handleKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" && this.internals.form) {
        // Find and click the form's submit button, or use requestSubmit
        this.internals.form.requestSubmit();
      }
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
      if (oldValue === newValue) return;

      switch (name) {
        case "label":
          if (this.labelEl) this.labelEl.textContent = newValue || "";
          break;
        case "errors":
          this.updateErrors(newValue);
          break;
        case "value":
          if (this.inputEl && this.inputEl.value !== newValue) {
            this.inputEl.value = newValue || "";
          }
          break;
        case "disabled":
          if (this.inputEl) this.inputEl.disabled = newValue !== null;
          break;
        case "required":
          if (this.inputEl) this.inputEl.required = newValue !== null;
          break;
        case "placeholder":
          if (this.inputEl) this.inputEl.placeholder = newValue || "";
          break;
        case "name":
          if (this.inputEl) this.inputEl.name = newValue || "";
          break;
        case "id":
          if (this.inputEl) this.inputEl.id = newValue || "";
          if (this.labelEl) this.labelEl.htmlFor = newValue || "";
          break;
        case "type":
          if (this.inputEl) this.inputEl.type = newValue || "text";
          break;
      }
    }

    private updateErrors(errorsAttr: string | null) {
      let errors: string[] = [];
      if (errorsAttr) {
        try {
          errors = JSON.parse(errorsAttr);
        } catch {
          errors = errorsAttr ? [errorsAttr] : [];
        }
      }

      if (this.errorEl) {
        this.errorEl.innerHTML = errors.map((error) => `<span class="error">${error}</span>`).join("");
      }

      if (this.inputEl) {
        this.inputEl.setAttribute("aria-invalid", String(errors.length > 0));
      }
    }

    // Form-associated custom element methods
    get value(): string {
      return this.inputEl?.value || "";
    }

    set value(val: string) {
      if (this.inputEl) {
        this.inputEl.value = val;
        this.internals.setFormValue(val);
      }
    }

    get form() {
      return this.internals.form;
    }

    get name() {
      return this.getAttribute("name");
    }

    set name(val: string | null) {
      if (val) {
        this.setAttribute("name", val);
      } else {
        this.removeAttribute("name");
      }
    }

    get validity() {
      return this.internals.validity;
    }

    get validationMessage() {
      return this.internals.validationMessage;
    }

    get willValidate() {
      return this.internals.willValidate;
    }

    checkValidity() {
      return this.internals.checkValidity();
    }

    reportValidity() {
      return this.internals.reportValidity();
    }

    formResetCallback() {
      if (this.inputEl) {
        this.inputEl.value = this.getAttribute("value") || "";
        this.internals.setFormValue(this.inputEl.value);
      }
    }

    // Focus delegation
    focus() {
      this.inputEl?.focus();
    }

    blur() {
      this.inputEl?.blur();
    }
  }

  // Register the custom element
  if (!customElements.get("conform-input")) {
    customElements.define("conform-input", ConformInput);
  }
}

export {};
