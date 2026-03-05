(function(){try{var e=typeof window<`u`?window:typeof global<`u`?global:typeof globalThis<`u`?globalThis:typeof self<`u`?self:{};e.SENTRY_RELEASE={id:`b84e38fdf015bb09d1a3ae613e2a6737c0b46eb0`};var t=new e.Error().stack;t&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[t]=`4c81fb59-52d9-408f-8293-5d85b7466bf9`,e._sentryDebugIdIdentifier=`sentry-dbid-4c81fb59-52d9-408f-8293-5d85b7466bf9`)}catch{}})();import{n as e,s as t,t as n}from"./jsx-runtime-dUzXX6C4.js";import"./react-dom-cWW4hCbC.js";import{C as r,I as i,L as a,O as o,P as s,a as c,c as l,d as u,f as d,o as f}from"./chunk-LFPYN7LY-B5uInW5K.js";import{r as p}from"./chunk-JPUPSTYD-DCKDgeiD.js";/* empty css                             */import{i as m,r as h,t as g}from"./theme.css-OMW5Wzex.js";import"./clickable-element.css-BxHLgzf1.js";import{t as _}from"./link-By6Qglde.js";var v=t(e(),1);if(typeof window<`u`&&typeof HTMLElement<`u`){class e extends HTMLElement{static formAssociated=!0;static get observedAttributes(){return[`name`,`id`,`label`,`errors`,`type`,`placeholder`,`required`,`disabled`,`value`]}internals;shadow;inputEl=null;labelEl=null;errorEl=null;constructor(){super(),this.internals=this.attachInternals(),this.shadow=this.attachShadow({mode:`open`}),this.render()}render(){let e=this.getAttribute(`label`)||``,t=this.getAttribute(`name`)||``,n=this.getAttribute(`id`)||t,r=this.getAttribute(`type`)||`text`,i=this.getAttribute(`placeholder`)||``,a=this.hasAttribute(`required`),o=this.hasAttribute(`disabled`),s=this.getAttribute(`value`)||``,c=this.getAttribute(`errors`),l=[];if(c)try{l=JSON.parse(c)}catch{l=c?[c]:[]}this.shadow.innerHTML=`
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

        <label for="${n}">${e}</label>
        <input
          type="${r}"
          name="${t}"
          id="${n}"
          placeholder="${i}"
          ${a?`required`:``}
          ${o?`disabled`:``}
          value="${s}"
          aria-invalid="${l.length>0}"
          aria-describedby="${n}-errors"
        />
        <div class="errors" id="${n}-errors">
          ${l.map(e=>`<span class="error">${e}</span>`).join(``)}
        </div>
      `,this.inputEl=this.shadow.querySelector(`input`),this.labelEl=this.shadow.querySelector(`label`),this.errorEl=this.shadow.querySelector(`.errors`),this.inputEl?.addEventListener(`input`,this.handleInput.bind(this)),this.inputEl?.addEventListener(`change`,this.handleChange.bind(this)),this.inputEl?.addEventListener(`blur`,this.handleBlur.bind(this)),this.inputEl?.addEventListener(`keydown`,this.handleKeydown.bind(this))}handleInput(e){let t=e.target;this.internals.setFormValue(t.value),this.dispatchEvent(new CustomEvent(`conform-input`,{bubbles:!0,composed:!0,detail:{value:t.value,name:this.getAttribute(`name`)}}))}handleChange(e){let t=e.target;this.dispatchEvent(new CustomEvent(`conform-change`,{bubbles:!0,composed:!0,detail:{value:t.value,name:this.getAttribute(`name`)}}))}handleBlur(){this.dispatchEvent(new CustomEvent(`conform-blur`,{bubbles:!0,composed:!0,detail:{name:this.getAttribute(`name`)}}))}handleKeydown(e){e.key===`Enter`&&this.internals.form&&this.internals.form.requestSubmit()}attributeChangedCallback(e,t,n){if(t!==n)switch(e){case`label`:this.labelEl&&(this.labelEl.textContent=n||``);break;case`errors`:this.updateErrors(n);break;case`value`:this.inputEl&&this.inputEl.value!==n&&(this.inputEl.value=n||``);break;case`disabled`:this.inputEl&&(this.inputEl.disabled=n!==null);break;case`required`:this.inputEl&&(this.inputEl.required=n!==null);break;case`placeholder`:this.inputEl&&(this.inputEl.placeholder=n||``);break;case`name`:this.inputEl&&(this.inputEl.name=n||``);break;case`id`:this.inputEl&&(this.inputEl.id=n||``),this.labelEl&&(this.labelEl.htmlFor=n||``);break;case`type`:this.inputEl&&(this.inputEl.type=n||`text`);break}}updateErrors(e){let t=[];if(e)try{t=JSON.parse(e)}catch{t=e?[e]:[]}this.errorEl&&(this.errorEl.innerHTML=t.map(e=>`<span class="error">${e}</span>`).join(``)),this.inputEl&&this.inputEl.setAttribute(`aria-invalid`,String(t.length>0))}get value(){return this.inputEl?.value||``}set value(e){this.inputEl&&(this.inputEl.value=e,this.internals.setFormValue(e))}get form(){return this.internals.form}get name(){return this.getAttribute(`name`)}set name(e){e?this.setAttribute(`name`,e):this.removeAttribute(`name`)}get validity(){return this.internals.validity}get validationMessage(){return this.internals.validationMessage}get willValidate(){return this.internals.willValidate}checkValidity(){return this.internals.checkValidity()}reportValidity(){return this.internals.reportValidity()}formResetCallback(){this.inputEl&&(this.inputEl.value=this.getAttribute(`value`)||``,this.internals.setFormValue(this.inputEl.value))}focus(){this.inputEl?.focus()}blur(){this.inputEl?.blur()}}customElements.get(`conform-input`)||customElements.define(`conform-input`,e)}var y=`_1bjqqmn0`,b=n();function x({children:e}){return(0,b.jsxs)(`html`,{lang:`en`,className:g,children:[(0,b.jsxs)(`head`,{children:[(0,b.jsx)(`meta`,{charSet:`utf-8`}),(0,b.jsx)(`meta`,{name:`viewport`,content:`width=device-width, initial-scale=1, viewport-fit=cover`}),(0,b.jsx)(`meta`,{name:`theme-color`,content:`#A9CBB7`}),(0,b.jsx)(`meta`,{name:`mobile-web-app-capable`,content:`yes`}),(0,b.jsx)(`meta`,{name:`apple-mobile-web-app-status-bar-style`,content:`default`}),(0,b.jsx)(`meta`,{name:`apple-mobile-web-app-title`,content:`Shorpin`}),(0,b.jsx)(`link`,{rel:`manifest`,href:`/manifest.webmanifest`}),(0,b.jsx)(`link`,{rel:`apple-touch-icon`,href:`/icons/apple-touch-icon.png`}),(0,b.jsx)(f,{}),(0,b.jsx)(c,{})]}),(0,b.jsxs)(`body`,{children:[e,(0,b.jsx)(d,{}),(0,b.jsx)(u,{})]})]})}var S=i(function({loaderData:{toast:e}}){let{pathname:t}=o();return(0,v.useEffect)(function(){document.documentElement.dataset.hydratedPath=t},[t]),(0,v.useEffect)(function(){e&&m[e.type](e.message)},[e]),(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)(`main`,{className:y,children:(0,b.jsx)(l,{})}),(0,b.jsx)(h,{position:`top-right`})]})});const C=a(function(){let e=s();if(r(e)){let t=typeof e.data==`string`?e.data:e.data?.message;return(0,b.jsxs)(`main`,{className:y,children:[(0,b.jsx)(`h1`,{children:e.status}),(0,b.jsx)(`p`,{children:t}),(0,b.jsx)(_,{to:p(`/`),children:`Back to home`})]})}return(0,b.jsxs)(`main`,{className:y,children:[(0,b.jsx)(`h1`,{children:`Something went wrong`}),(0,b.jsx)(`p`,{children:e instanceof Error?e.message:`Unknown error`})]})});export{C as ErrorBoundary,x as Layout,S as default};