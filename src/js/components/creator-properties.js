import { Component } from './base.js';
import { escapeHtml } from '../utils/sanitize.js';

export class CreatorProperties extends Component {
  #nameInput = null;
  #descInput = null;
  #onAction = null;

  constructor({ onAction } = {}) {
    super();
    this.#onAction = typeof onAction === 'function' ? onAction : null;
  }

  render() {
    const aside = document.createElement('aside');
    aside.className = 'creator-properties';
    aside.setAttribute('aria-label', 'Propriedades da fase');

    const title = document.createElement('h2');
    title.className = 'creator-properties__title';
    title.textContent = 'Propriedades';
    aside.appendChild(title);

    const fields = document.createElement('div');
    fields.className = 'creator-properties__fields';

    // Nome da Fase
    const nameField = document.createElement('div');
    nameField.className = 'creator-properties__field';

    const nameLabel = document.createElement('label');
    nameLabel.className = 'creator-properties__label';
    nameLabel.setAttribute('for', 'level-name');
    nameLabel.textContent = 'Nome da Fase';
    nameField.appendChild(nameLabel);

    this.#nameInput = document.createElement('input');
    this.#nameInput.className = 'creator-properties__input';
    this.#nameInput.id = 'level-name';
    this.#nameInput.type = 'text';
    this.#nameInput.value = 'Snake Trap 01';
    nameField.appendChild(this.#nameInput);

    fields.appendChild(nameField);

    // Descrição
    const descField = document.createElement('div');
    descField.className = 'creator-properties__field';

    const descLabel = document.createElement('label');
    descLabel.className = 'creator-properties__label';
    descLabel.setAttribute('for', 'level-desc');
    descLabel.textContent = 'Descrição';
    descField.appendChild(descLabel);

    this.#descInput = document.createElement('textarea');
    this.#descInput.className = 'creator-properties__input creator-properties__input--textarea';
    this.#descInput.id = 'level-desc';
    this.#descInput.rows = 3;
    this.#descInput.placeholder = 'Descrição da fase...';
    descField.appendChild(this.#descInput);

    fields.appendChild(descField);
    aside.appendChild(fields);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'creator-properties__actions';

    actions.appendChild(this.#actionBtn('import', 'download', 'Importar', 'primary'));
    actions.appendChild(this.#actionBtn('export', 'upload', 'Exportar', 'primary'));
    actions.appendChild(this.#actionBtn('save', 'save', 'Salvar Fase', 'secondary', true));

    const clearBtn = document.createElement('button');
    clearBtn.className = 'creator-properties__btn creator-properties__btn--primary';
    clearBtn.type = 'button';

    const clearImg = document.createElement('img');
    clearImg.className = 'creator-properties__btn-img';
    clearImg.src = 'src/assets/images/icons/snake-icons/icon-clear.svg';
    clearImg.alt = '';
    clearImg.setAttribute('aria-hidden', 'true');
    clearImg.width = 20;
    clearImg.height = 20;
    clearBtn.appendChild(clearImg);

    const clearLabel = document.createTextNode(' Limpar Tudo');
    clearBtn.appendChild(clearLabel);

    clearBtn.addEventListener('click', () => {
      if (this.#onAction) this.#onAction('clear');
    });

    actions.appendChild(clearBtn);

    aside.appendChild(actions);

    return aside;
  }

  #actionBtn(actionId, iconName, text, variant, filledIcon) {
    const btn = document.createElement('button');
    btn.className = `creator-properties__btn creator-properties__btn--${variant}`;
    btn.type = 'button';

    const icon = document.createElement('span');
    icon.className = `material-symbols-outlined creator-properties__btn-icon${filledIcon ? ' creator-properties__btn-icon--fill' : ''}`;
    icon.textContent = iconName;
    btn.appendChild(icon);

    btn.appendChild(document.createTextNode(` ${text}`));

    btn.addEventListener('click', () => {
      if (this.#onAction) this.#onAction(actionId);
    });

    return btn;
  }

  getValues() {
    return {
      name: this.#nameInput ? escapeHtml(this.#nameInput.value) : '',
      description: this.#descInput ? escapeHtml(this.#descInput.value) : '',
    };
  }

  setValues({ name, description } = {}) {
    if (name !== undefined && this.#nameInput) {
      this.#nameInput.value = name;
    }
    if (description !== undefined && this.#descInput) {
      this.#descInput.value = description;
    }
  }
}
