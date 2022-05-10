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
    // Note that to get the attributeChangedCallback() callback to fire when an attribute changes, you have to observe the attributes.
    // This is done by specifying a static get observedAttributes() method inside custom element class - this should return 
    // an array containing the names of the attributes you want to observe:
    // static get observedAttributes() { return ["hidden"] }

    constructor() {
        super()

        // init required global events (note: these will be binded only once)
        DataList.bindGlobalEvents()

        /**
         * create all instance bindings
         * @type {{target:HTMLElement,binding:Array<Array<String,Function,*>>}}
         * @example [{ target: document.body, binding: ["touchstart", (e) => {}, {passive:true}] }, ...]
         */
        this.bindings = []

        /**
         * mutation observer to monitor childList changes. required for connectObserver
         * @type {null|MutationObserver}
         */
        // this.observer = null

        // create and connect mutation observer to monitor childList changes
        // this has an issue, when data-list is added after page init:
        // The childList mutation callback does not get invoked and no article sections are created
        // this.connectObserver()

        // Create a shadow root
        this.attachShadow({ mode: "open" })

        // add template
        this.shadowRoot.appendChild(template.content.cloneNode(true))

        // get and set root article element
        this.article = this.shadowRoot.querySelector("article")

        // create all bindings for this instance
        this.createBindings()
    }

    /** life-cycle callback: invoked each time the custom element is appended into a document-connected element */
    connectedCallback() {
        // add to static collection
        DataList.datalists.push(this)

        // optional: make the data-list hidden by default or use CSS: data-list { display: none; }
        this.setAttribute("hidden", "")

        // bind all events
        this.addBindings()

        // optional: show warning if no input points to this data-list element at all
        if (!this.id) console.warn("DataList web component does not have target 'id' set.")

        // delay to make sure it exists in the DOM
        // previous used MutationObserver, but it had an issue (see constructor about connectObserver comments)
        setTimeout(() => {
            // console.log(`${this.constructor.name} #${this.id} connectedCallback delayed:`, this.children)
            let isOptionMutated = false
            for (const node of this.children) {
                if (node.tagName !== "OPTION") continue; // skip non-option element
                isOptionMutated = true
                // create list items from option elements
                // note: option.label will fallback to textContent as value(by the browser)
                if (node.hasAttribute("label")) {
                    this.add([node.value, node.label, node.textContent])
                } else {
                    this.add([node.value, node.textContent])
                }
            }
            // if any option element were found, update filtered items
            if (this.article != null && isOptionMutated) {
                if (!this.article.hasAttribute("hidden")) { // update only when visible
                    // TODO get current input value
                    this.filterRows(this.article, ""/*e.target.value*/)
                }
            }
        }, 0)
    }

    /** life-cycle callback: Invoked each time the custom element is disconnected from the document's DOM */
    disconnectedCallback() {
        this.removeBindings() // unbind all events
        window.clearTimeout(DataList.timeoutThrottleResize)
        window.clearTimeout(DataList.timeoutDebounceInput)
        window.clearTimeout(DataList.timeoutInputFocusout)
        window.clearTimeout(DataList.timeoutMousedown)
        // reset previous observer if exist
        // if (this.observer != null) this.observer.disconnect()
        // remove from static collection
        DataList.datalists = DataList.datalists.filter(p => p.id != this.id)
    }

    /** life-cycle callback: Invoked each time the custom element is moved to a new document */
    // adoptedCallback() {
    //     console.log("Custom DataList element moved to new page.")
    // }

    /** life-cycle callback: invoked when one of the custom element's attributes is added, removed, or changed */
    // Note: requires static observedAttributes
    // attributeChangedCallback(name, oldValue, newValue) {
    //     console.log("Custom DataList element attributes changed.", name, oldValue, newValue)
    // }

    /**
     * create and set `this.observer` MutationObserver to observe the `childList` nodes.
     */
    // connectObserver() {
    //     // reset previous observer if exist
    //     if (this.observer != null) this.observer.disconnect()
    //     // monitor added children for option elements
    //     this.observer = new MutationObserver((mutations) => {
    //         let isOptionMutated = false
    //         for (const mutation of mutations) {
    //             // console.log(`${this.constructor.name} #${this.id} MutationObserver`, mutation)
    //             switch (mutation.type) {
    //                 case "childList":
    //                     for (const node of mutation.addedNodes) {
    //                         // console.log(`${this.constructor.name} #${this.id} MutationObserver:childList`, mutation)
    //                         if (node.tagName !== "OPTION") continue; // skip non-option element
    //                         isOptionMutated = true
    //                         // console.log(`${this.constructor.name} #${this.id} MutationObserver`, node) //=<option></option>
    //                         // create list items from option elements
    //                         // note: option.label will fallback to textContent as value(by the browser)
    //                         if (node.hasAttribute("label")) {
    //                             this.add([node.value, node.label, node.textContent])
    //                         } else {
    //                             this.add([node.value, node.textContent])
    //                         }
    //                     }
    //                     break;
    //                 // case "attributes": break;
    //                 default: break;
    //             }
    //         }
    //         // if any option element were found, update filtered items
    //         if (this.article != null && isOptionMutated) {
    //             if (!this.article.hasAttribute("hidden")) {
    //                 // TODO get current input value
    //                 this.filterRows(this.article, ""/*e.target.value*/)
    //             }
    //         }
    //         // if (document.body.contains(this)) {
    //         //     this.observer.disconnect()
    //         //     // console.log("MutationObserver: Element exist in the DOM, stopping the observer")
    //         //     this.afterConnectedCallback()
    //         // }
    //     })
    //     // start observing
    //     this.observer.observe(this, {
    //         // attributes: true, // monitor data-list attribute changes
    //         childList: true // monitor added or changes option elements
    //         //subtree: true
    //     })
    // }

    /**
     * create and set `this.bindings` for all nessessary event bindings
     */
    createBindings() {
        // Event bindings (this fires before focusout)
        // Note: no need to prevent default drag event on mobile, so use passive event handler
        this.bindings.push({
            target: this.article,
            binding: ["touchstart", (e) => {
                if (e.target.closest("section") != null) {
                    // clear input focusout timer, that will hide this Element
                    window.clearTimeout(DataList.timeoutInputFocusout)
                }
            }, { passive: true }]
        })

        // Event bindings (this fires before focusout)
        // Note: this will be invoked when you drag the scroll bar with mouse
        this.bindings.push({
            target: this.article,
            binding: ["mousedown", (e) => {
                e.preventDefault(); // this will prevent the "select text", when you drag over the article elements
                if (e.target.closest("section") != null) {
                    // wait untill focusout fires 10ms should be enough, but not too much
                    window.clearTimeout(DataList.timeoutMousedown)
                    DataList.timeoutMousedown = window.setTimeout(() => {
                        // clear input focusout timer, that will hide this Element
                        window.clearTimeout(DataList.timeoutInputFocusout)
                    }, 20)
                }
            }]
        })

        // Event bindings
        this.bindings.push({
            target: this.article,
            binding: ["click", (e) => {
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
            }]
        })
    }

    /** add all instance bindings */
    addBindings() {
        for (const binding of this.bindings) {
            binding.target.addEventListener(...binding.binding)
        }
    }

    /** remove all instance bindings */
    removeBindings() {
        for (const binding of this.bindings) {
            binding.target.removeEventListener(...binding.binding)
        }
    }

    // filter rows by value
    filterRows(value) {
        if (!this.isConnected) return // do nothing if not in the DOM
        let lastVisibleChildIndex = -1
        const sValue = ("" + value).toLowerCase()

        // update section visibility
        for (let index = 0, len = this.article.children.length; index < len; index++) {
            let child = this.article.children[index]
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
            this.article.removeAttribute("hidden")
            this.article.children[lastVisibleChildIndex].classList.add("no-border-bottom") // CSS visible last border bottom
        } else {
            this.article.setAttribute("hidden", "")
        }
    }

    /**
     * update CSS height, position, etc.
     * 
     * @todo In fixed state, show current input element at the top
     * 
     * @param {*} target 
     */
    updateStyles(target) {
        if (!this.isConnected) return // do nothing if not in the DOM
        const article = this.article || this.shadowRoot.querySelector("article")
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
        // const article = this.shadowRoot.querySelector("article")
        // create value container elements
        for (const value of values) {
            if (Array.isArray(value)) {
                // 0)option.value
                // 1)option.label
                // 2)option.textContent
                this.article.appendChild(this.createSection(value[0], value[1], value[2]))
            } else {
                this.article.appendChild(this.createSection(value))
            }
        }
    }

    /** add any elements to the parent article */
    // addRaw(...values) {
    //     this.article.append(...values)
    // }

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
    // get rows() {
    //     // fallback to query selector
    //     return this.article.childNodes
    // }

    /** get row count */
    // get length() {
    //     return this.rows.length
    // }

    /** delete row by index and return deleted index or -1 if not found */
    // delete(index = -1) {
    //     const row = this.rows[index]
    //     if (row != null) {
    //         row.remove()
    //         return index
    //     }
    //     return -1
    // }

    /** empty all list items */
    // empty() {
    //     this.article.innerHTML = ""
    // }

    /**
     * bind these global events only once
     */
    static bindGlobalEvents() {
        if (DataList.isGlobalEventsBinded) return // only once
        DataList.isGlobalEventsBinded = true
        // console.log("Global DataList events are now binded")

        // bind window events
        window.addEventListener("resize", (event) => {
            if (DataList.timeoutThrottleResize != null) return
            DataList.timeoutThrottleResize = window.setTimeout(() => {
                try {
                    DataList.timeoutThrottleResize = null
                    const targets = document.querySelectorAll("input[list]") // binded to these inputs
                    for (const target of targets) {
                        target.dispatchEvent(new Event("resize"))
                        // todo can the callback be handled here?
                        try {
                            window.clearTimeout(DataList.timeoutMousedown)
                            // window.clearTimeout(DataList.timeoutInputFocusout)
                            DataList.datalists.forEach(datalist => {
                                datalist.updateStyles(target)
                            })
                        } catch (error) {
                            console.error(`DataList input[list="${this.id}"] resize event failure`, error)
                        }
                    }
                } catch (error) {
                    console.error("DataList window resize event failure", error)
                }
            }, 200)
        })

        // bind document events, but first make sure document is loaded
        document.addEventListener("DOMContentLoaded", () => {
            /** event delegation to input[list] click: open the datalist UI */
            document.body.addEventListener("click", (e) => {
                try {
                    const input = e.target.closest(`input[list]`)
                    if (input == null) return
                    DataList.datalists.forEach(datalist => {
                        if (datalist.id == input.getAttribute("list")) {
                            datalist.removeAttribute("hidden")
                            datalist.updateStyles(input)
                            datalist.filterRows(input.value)
                        }
                    })
                } catch (error) {
                    console.error(`DataList input[list="${this.id}"] click event failure`, error)
                }
            })

            /**
             * event delegation to input[list] focusout:
             * when target focus changes for example:
             * you scroll the data-list with mousedown/touchstart, it begins to hide the data-list.
             * to keep the data-list visible in this case, we start a timeout here and check on the 
             * data-list article element touchstart/mousedown event that the target element is data-list section element.
             * if it is, then clear this timeout and keep UI open.
             */
            document.body.addEventListener("focusout", (e) => {
                window.clearTimeout(DataList.timeoutInputFocusout)
                // delayed for the click/touchstart/mousedown event to pass-through
                DataList.timeoutInputFocusout = window.setTimeout(() => {
                    try {
                        const input = e.target.closest(`input[list]`)
                        if (input == null) return
                        DataList.datalists.forEach(datalist => {
                            if (datalist.id == input.getAttribute("list")) {
                                // hide only, when target changed
                                if (datalist != document.activeElement) {
                                    datalist.setAttribute("hidden", "")
                                }
                            }
                        })
                    } catch (error) {
                        console.error(`DataList input[list="${this.id}"] focusout event failure`, error)
                    }
                }, 100)
            })

            /** event delegation to input[list] input: debounce input event */
            document.body.addEventListener("input", (e) => {
                if (!e.isTrusted) return // skip our emulated input event when selecting items from the list
                window.clearTimeout(DataList.timeoutDebounceInput)
                DataList.timeoutDebounceInput = window.setTimeout(() => {
                    try {
                        const input = e.target.closest(`input[list]`)
                        if (input == null) return
                        DataList.datalists.forEach(datalist => {
                            if (datalist.id == input.getAttribute("list")) {
                                datalist.removeAttribute("hidden")
                                datalist.filterRows(e.target.value)
                            }
                        })
                    } catch (error) {
                        console.error(`DataList input[list="${this.id}"] input event failure`, error)
                    }
                }, 150)
            })
        })
    }

}
// static props
DataList.isGlobalEventsBinded = false
DataList.timeoutDebounceInput = null // debounce event input to filter UI elements
DataList.timeoutInputFocusout = null
DataList.timeoutMousedown = null
DataList.timeoutThrottleResize = null
/**
 * keep reference to all datalists for event delegation in bindGlobalEvents
 * @type {Array<DataList>}
 */
DataList.datalists = []

// define web component
customElements.define("data-list", DataList)