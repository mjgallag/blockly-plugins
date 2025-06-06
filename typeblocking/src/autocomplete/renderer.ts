import {Option} from '../types';

/** Renderer for the input and suggestion list. */
export class Renderer {
  readonly root: HTMLElement;
  private input!: HTMLInputElement;
  private list!: HTMLUListElement;
  private highlighted = -1;

  constructor(onChoose: (value: string) => void, initial = '') {
    this.root = document.createElement('div');
    this.root.innerHTML = `
      <input type="text" spellcheck="false" class="fi-input" />
      <ul class="fi-list" hidden></ul>
    `;

    this.input = this.root.querySelector('.fi-input') as HTMLInputElement;
    this.list = this.root.querySelector('.fi-list') as HTMLUListElement;
    this.input.value = initial;

    this.list.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      const li = (ev.target as HTMLElement).closest('li');
      if (li) onChoose(li.dataset.value!);
    });
  }

  focus(): void {
    this.input.focus();
    const len = this.input.value.length;
    this.input.setSelectionRange(len, len);
  }

  setSuggestions(suggestions: Option[]): void {
    this.list.innerHTML = '';
    suggestions.forEach((s) => {
      const li = document.createElement('li');
      li.dataset.value = s;
      li.textContent = s;
      this.list.appendChild(li);
    });

    // Auto-select the first option if suggestions are available
    if (suggestions.length > 0) {
      this.updateHighlight(0);
    } else {
      this.highlighted = -1;
    }

    this.list.hidden = suggestions.length === 0;
  }

  onKey(key: string, choose: (v: string) => void): boolean {
    const items = Array.from(this.list.children) as HTMLElement[];

    const commit = (): boolean => {
      if (this.highlighted >= 0 && this.highlighted < items.length) {
        choose(items[this.highlighted].dataset.value!);
        return true;
      }
      return false;
    };

    switch (key) {
      case 'ArrowDown':
        this.updateHighlight(Math.min(this.highlighted + 1, items.length - 1));
        return true;
      case 'ArrowUp':
        this.updateHighlight(Math.max(this.highlighted - 1, 0));
        return true;
      case 'Enter':
      case 'Tab':
        return commit();
      default:
        return false;
    }
  }

  get query(): string {
    return this.input.value;
  }
  get inputEl(): HTMLInputElement {
    return this.input;
  }

  private updateHighlight(idx: number): void {
    const items = Array.from(this.list.children) as HTMLElement[];
    if (this.highlighted >= 0) {
      items[this.highlighted].classList.remove('fi-hl');
    }

    this.highlighted = idx;

    if (this.highlighted >= 0) {
      items[this.highlighted].classList.add('fi-hl');
      items[this.highlighted].scrollIntoView({block: 'nearest'});
    }
  }
}
