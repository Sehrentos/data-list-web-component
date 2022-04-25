const template = document.createElement("template")
template.innerHTML = `<style>
article::-webkit-scrollbar {
    width: .2em;
  }
  article::-webkit-scrollbar-track {
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
  }
  article::-webkit-scrollbar-thumb {
    background-color: darkgrey;
    outline: 1px solid slategrey;
  }
  article {
    position: absolute;
    top: 1em;
    left: 2em;
    z-index: 99999;
    box-sizing: border-box;
    max-height: 50vh;
    border-width: 1px;
    border-color: #cccccc;
    border-style: solid;
    border-radius: 0.4em;
    background-color: #ffffff;
    overflow-y: auto;
    font-family: system-ui;
  }
  [hidden] { display: none; }
  section {
    margin: 0 0.5em;
    padding: 0.5em 0;
    border-bottom-width: 1px;
    border-bottom-color: #cccccc;
    border-bottom-style: solid;
    content-visibility: auto;
    contain-intrinsic-size: 57px;
  }
  .no-border-bottom,
  section:last-child {
    border-bottom: none;
  }
  section h2 {
    margin-top: 0.25em;
    margin-bottom: 0.25em;
    font-size: 1em;
    font-weight: normal;
    color: #000000;
  }
  section p {
    margin-top: 0.25em;
    margin-bottom: 0.25em;
    color: #626262;
  }
</style>
<article></article>`

/**
 * The data-list web component
 */
class DataList extends HTMLElement {
    static isWindowEventsBinded = false
    static timeoutDebounceInput = null // debounce event input to filter UI elements
    static timeoutInputFocusout = null
    static timeoutMousedown = null
    static timeoutThrottleResize = null

    // Note that to get the attributeChangedCallback() callback to fire when an attribute changes, you have to observe the attributes.
    // This is done by specifying a static get observedAttributes() method inside custom element class - this should return 
    // an array containing the names of the attributes you want to observe:
    // static get observedAttributes() { return ["hidden"] }

    constructor() {
        super()

        // Required window event to inform all elements that require resizing after screen size changes
        if (!DataList.isWindowEventsBinded) {
            DataList.isWindowEventsBinded = true
            window.addEventListener("resize", DataList.windowResizeHandler)
        }

        // Create a shadow root
        this.attachShadow({
            mode: "open"
        })

        // add template
        this.shadowRoot.appendChild(template.content.cloneNode(true))

        // get element
        const article = this.shadowRoot.querySelector("article") // document.createElement("article")

        // Event bindings (this fires before focusout)
        article.addEventListener("touchstart", (e) => {
            const section = e.target.closest("section")
            if (section != null) {
                // clear input focusout timer, that will hide this Element
                window.clearTimeout(DataList.timeoutInputFocusout)
            }
        }, { passive: true })

        // Event bindings (this fires before focusout)
        article.addEventListener("mousedown", (e) => {
            if (e.target.closest("section") != null) {
                // wait untill focusout fires 10ms should be enough, but not too much
                window.clearTimeout(DataList.timeoutMousedown)
                DataList.timeoutMousedown = window.setTimeout(() => {
                    // clear input focusout timer, that will hide this Element
                    window.clearTimeout(DataList.timeoutInputFocusout)
                }, 20)
            }
        }, { passive: true })

        // Event bindings
        article.addEventListener("click", (e) => {
            const section = e.target.closest("section")
            if (section != null) {
                // mimic datalist item selected events
                // find any input Element with [list=<this-id>] tag
                // and trigger oninput Event
                const event = new Event("input")
                /** @type {Array<HTMLInputElement>} */
                const targets = Array.from(document.querySelectorAll(`input[list="${this.id}"]`))
                for (const elem of targets) {
                    elem.value = section.getAttribute("data-value")
                    elem.dispatchEvent(event)
                }
                const visibleTarget = targets.find(el => !el.hasAttribute("hidden"))
                if (visibleTarget != null) visibleTarget.focus()
                // hide the Element
                this.setAttribute("hidden", "")
            }
        })
    }

    // life-cycle callback: invoked each time the custom element is appended into a document-connected element
    connectedCallback() {
        if (!this.id) return console.warn("DataList web component does not have target 'id' set.")
        // optional: make the data-list hidden by default or use CSS:
        // data-list { display: none; }
        this.setAttribute("hidden", "")

        const article = this.shadowRoot.querySelector("article")

        // get list targets and update event bingings
        const targets = document.querySelectorAll(`input[list="${this.id}"]`)

        for (const target of targets) {
            // listen for window resize events called from static windowResizeHandler
            target.addEventListener("resize", (e) => {
                try {
                    window.clearTimeout(DataList.timeoutMousedown)
                    window.clearTimeout(DataList.timeoutInputFocusout)
                    this.updateStyles(article, e.target)
                } catch (error) {
                    console.error(`DataList input[list="${this.id}"] resize event failure`, error)
                }
            })

            // clicking the datalist will open the UI
            target.addEventListener("click", (e) => {
                try {
                    this.processChildElements()
                    this.removeAttribute("hidden")
                    this.updateStyles(article, e.target)
                    this.filterRows(article, e.target.value)
                } catch (error) {
                    console.error(`DataList input[list="${this.id}"] click event failure`, error)
                }
            })

            target.addEventListener("focusout", (e) => {
                window.clearTimeout(DataList.timeoutInputFocusout)
                DataList.timeoutInputFocusout = window.setTimeout(() => { // delayed for the click event to pass-through
                    try {
                        this.setAttribute("hidden", "")
                    } catch (error) {
                        console.error(`DataList input[list="${this.id}"] focusout event failure`, error)
                    }
                }, 100)
            })

            // input event with debouncing
            target.addEventListener("input", (e) => {
                if (!e.isTrusted) return // skip our emulated input event when selecting items from the list
                window.clearTimeout(DataList.timeoutDebounceInput)
                DataList.timeoutDebounceInput = window.setTimeout(() => {
                    try {
                        this.removeAttribute("hidden")
                        this.filterRows(article, e.target.value)
                    } catch (error) {
                        console.error(`DataList input[list="${this.id}"] input event failure`, error)
                    }
                }, 150)
            })
        }
    }

    // life-cycle callback: Invoked each time the custom element is disconnected from the document's DOM
    disconnectedCallback() {
        window.clearTimeout(DataList.timeoutThrottleResize)
        window.clearTimeout(DataList.timeoutDebounceInput)
        window.clearTimeout(DataList.timeoutInputFocusout)
        window.clearTimeout(DataList.timeoutMousedown)
    }

    // life-cycle callback: Invoked each time the custom element is moved to a new document
    // adoptedCallback() {
    //     console.log("Custom DataList element moved to new page.")
    // }

    // life-cycle callback: invoked when one of the custom element's attributes is added, removed, or changed
    // Note: requires static observedAttributes
    // attributeChangedCallback(name, oldValue, newValue) {
    //     console.log("Custom DataList element attributes changed.", name, oldValue, newValue)
    // }

    /**
     * create list items from child option elements
     */
    processChildElements() {
        this.empty() // clear all previous
        for (const child of this.children) {
            if (child.tagName !== "OPTION") break
            // note: option.label will fallback to textContent as value(by the browser)
            if (child.hasAttribute("label")) {
                this.add([child.value, child.label, child.textContent])
            } else {
                this.add([child.value, child.textContent])
            }
        }
    }

    // filter rows by value
    filterRows(article, value) {
        let lastVisibleChildIndex = -1
        const sValue = ("" + value).toLowerCase()

        // update section visibility
        for (let index = 0, len = article.children.length; index < len; index++) {
            let child = article.children[index]
            child.classList.remove("no-border-bottom") // reset CSS visible last border bottom

            // section content
            if (child.textContent.toLowerCase().includes(sValue)) {
                lastVisibleChildIndex = index
                child.removeAttribute("hidden")
            }
            // section dataset
            else if (child.hasAttribute("data-value") && ("" + child.getAttribute("data-value")).toLowerCase().includes(sValue)) {
                lastVisibleChildIndex = index
                child.removeAttribute("hidden")
            } else {
                child.setAttribute("hidden", "")
            }
        }
        // update article visibility
        if (lastVisibleChildIndex > -1) {
            article.removeAttribute("hidden")
            article.children[lastVisibleChildIndex].classList.add("no-border-bottom") // CSS visible last border bottom
        } else {
            article.setAttribute("hidden", "")
        }
    }

    /**
     * update CSS height, position, etc.
     * 
     * @todo In fixed state, show current input element at the top
     * 
     * @param {*} article 
     * @param {*} target 
     */
    updateStyles(article, target) {
        const clientHeight = window.innerHeight
        const rect = target.getBoundingClientRect()
        // make it begin at the element bottom
        article.style.top = `${rect.top + rect.height}px`
        article.style.left = `${rect.left}px`
        article.style.maxHeight = `calc(100vh - ${rect.top/* + window.scrollY*/}px - 2em)`
        article.style.width = `${rect.width}px`
        // tiny screen will use fixed full screen instead
        if (clientHeight < 450) {
            article.style.position = "fixed"
            article.style.top = "0.5em"
            article.style.bottom = "0.5em"
            article.style.height = "calc(100vh - 1em)"
            article.style.maxHeight = "calc(100vh - 1em)"
        }
        // when input goes below this height, swap top position instead
        else if (rect.top > clientHeight / 2) {
            article.style.top = "auto"
            article.style.maxHeight = `calc(${rect.top}px - 1em)`
            article.style.bottom = `calc(100vh - ${rect.top + window.scrollY}px`
        }
    }

    /** add items to the list */
    add(...values) {
        const article = this.shadowRoot.querySelector("article")
        // create value container elements
        for (const value of values) {
            if (Array.isArray(value)) {
                // 0)option.value
                // 1)option.label
                // 2)option.textContent
                article.appendChild(this.createSection(value[0], value[1], value[2]))
            } else {
                article.appendChild(this.createSection(value))
            }
        }
    }

    /** add any elements to the parent article */
    addRaw(...values) {
        this.shadowRoot.querySelector("article").append(...values)
    }

    /** create option element for data-list */
    createOption(value, label, textContent) {
        const option = document.createElement("option")
        option.value = value
        if (label != null && textContent != null) option.label = label
        option.textContent = textContent != null ? textContent : label
        return option // <option value="1" label="Title">Description</option>
    }

    /** create row as section element */
    createSection(value, label, textContent) {
        // create section element for shadow article
        const section = document.createElement("section")

        // header
        // note: option.label will fallback to textContent as value(by the browser)
        const h2 = document.createElement("h2")
        h2.textContent = label != null ? label : value
        if (!h2.textContent.length) h2.textContent = value
        section.append(h2)

        // text content
        if (typeof textContent === "string" || typeof textContent === "number") {
            const p = document.createElement("p")
            p.textContent = textContent
            section.append(p)
        }

        // dataset
        //section.setAttribute("data-label", label)
        section.setAttribute("data-value", value)
        return section // [option, section]
    }

    /** get all rows */
    get rows() {
        // fallback to query selector
        return this.shadowRoot.querySelector("article").childNodes
    }

    /** get row count */
    get length() {
        return this.rows.length
    }

    /** delete row by index and return deleted index or -1 if not found */
    delete(index = -1) {
        const row = this.rows[index]
        if (row != null) {
            row.remove()
            return index
        }
        return -1
    }

    /** empty all list items */
    empty() {
        // const rows = this.rows
        // for (const row of rows) {
        //     row.remove()
        // }
        this.shadowRoot.querySelector("article").innerHTML = ""
    }

    static windowResizeHandler(event) {
        if (DataList.timeoutThrottleResize != null) return
        DataList.timeoutThrottleResize = window.setTimeout(() => {
            try {
                DataList.timeoutThrottleResize = null
                const targets = document.querySelectorAll("input[list]") // binded to these inputs
                for (const target of targets) {
                    target.dispatchEvent(new Event("resize"))
                }
            } catch (error) {
                console.error("DataList window resize event failure", error)
            }
        }, 200)
    }
}
customElements.define("data-list", DataList)