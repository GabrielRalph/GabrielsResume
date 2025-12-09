function createTemplateObject(templateString) {
    const template = document.createElement('template');
    template.innerHTML = templateString;
    return template;
}

function getValue(key, data) {
    let result = null;
    
    if (typeof key === "string") {
        key = key.trim();
        if (key === "." || key === "") {
            result = data;
        } else if (typeof data === 'object' && data !== null) {
            let path = key.split('.');
            for (let i = 0; i < path.length; i++) {
                data = data[path[i]];
            }
            result = data;
        } 
    }

    return result;
}

function textTemplate(string, data, extraScope={}) {
    let expresions = [];
    let startIndex = -1;
    let braceCount = 0;
    let expr = '';
    for (let i = 1; i < string.length; i++) {
        if (string[i-1] === "{" && string[i] === "{" && braceCount == 0) {
            startIndex = i - 1;
            braceCount = 2;
        } else if (braceCount > 0) {
            if (string[i] === "}" ) {
                braceCount -= 1;
            } else if (string[i] === "{") {
                braceCount += 1;
            } 
            
            if (braceCount === 0) {
                expresions.push({
                    start: startIndex,
                    end: i,
                    value: expr.slice(0, -1).trim()
                });
                expr = '';
                startIndex = -1;
            } else {
                expr += string[i];
            }
        }
    }

    if (expresions.length > 0) {
        let str = "";
        let lastIndex = 0;
        for (let i = 0; i < expresions.length; i++) { 
            let expression = expresions[i];
            let value = "";
            if (expression.value === '.' || expression.value === '') {
                value = data;
            } else {
                try {
                    let funText = expression.value.replace("&gt;", ">").replace("&lt;", "<");
                    let funct = new Function(...Object.keys(data), ...Object.keys(extraScope||{}), `return ${funText};`);
                    value = funct(...Object.values(data), ...Object.values(extraScope||{}));
                } catch (e) {
                    console.error("Error evaluating template expression:", expression.value, e);
                    value = "error"
                }
            }
            
            str += string.slice(lastIndex, expression.start);
            str += value !== undefined ? value : '';
            lastIndex = expression.end + 1;
        }
        string = str + string.slice(lastIndex);
    }
    return string;
}



class TElement extends HTMLElement {
    constructor() {
        super();
    }
    _templateNode(node, data) {
        if (node instanceof TElement) {
            node.value = data;
        } else if (node instanceof Text) {
            node.textContent = textTemplate(node.textContent, data);
        } else if (node instanceof Element) {
            for (let attr of node.attributes) {
                attr.value = textTemplate(attr.value, data);
            }
            for (let child of node.childNodes) {
                this._templateNode(child, data);
            }
        } 
    }
}


class TFrame extends TElement {
    constructor() {
        super();
        this._template = this.innerHTML;
    }

    set value(value) {
        let rootKey = this.getAttribute('key') || '';
        let data = getValue(rootKey, value);

        this.innerHTML = this._template;
        for (let child of this.childNodes) {
            this._templateNode(child, data);
        }
        this.toggleAttribute("unset", false);
    }
}

class TFor extends TElement {
    constructor() {
        super();
        this._template = this.innerHTML;
    }

    set value(value) {
        let rootKey = this.getAttribute('key') || '';
        let data = getValue(rootKey, value);
        if (Array.isArray(data)) {
            this.innerHTML = '';
            for (let item of data) {
                let templateInstance = document.createElement('div');
                templateInstance.innerHTML = this._template;
                for (let child of [...templateInstance.childNodes]) {
                    this._templateNode(child, item);
                    this.appendChild(child);
                }
            }
        }
    }
}

class TStyle extends TElement {
    constructor() {
        super();
        this._template = this.innerHTML;
    }

    set value(value) {
        let rootKey = this.getAttribute('key') || '';
        let data = getValue(rootKey, value);
        let styleContent = textTemplate(this._template, data);
        this.innerHTML = `<style>${styleContent}</style>`;
    }
}

class TImage extends TElement {
    constructor() {
        super();
        this._attributes = {};
        for (let attr of [...this.attributes]) {
            this._attributes[attr.name] = attr.value;
            this.removeAttribute(attr.name);
        }
        this.style.display = "contents";
    }

    set value(value) {
        let image = new Image();
        for (let attrName in this._attributes) {
            let attrValue = textTemplate(this._attributes[attrName], value);
            image.setAttribute(attrName, attrValue);
        }
        this.innerHTML = '';
        this.appendChild(image);
    }
}

customElements.define('t-frame', TFrame);
customElements.define('t-for', TFor);
customElements.define('t-style', TStyle);
customElements.define('t-img', TImage);