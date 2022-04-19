/**
 * The data-list web component
 */
 class DataList extends HTMLElement {
    static isWindowEventsBinded = false
    // static timeoutDebounceOpen = null // debounce event focusin|click to open the UI view
    static timeoutDebounceInput = null // debounce event input to filter UI elements
    static timeoutInputFocusout = null
    static timeoutMousedown = null
    static timeoutThrottleResize = { timer: null, callback: null, delay: 200 }

    // Note that to get the attributeChangedCallback() callback to fire when an attribute changes, you have to observe the attributes.
    // This is done by specifying a static get observedAttributes() method inside custom element class - this should return 
    // an array containing the names of the attributes you want to observe:
    // static get observedAttributes() { return ["hidden"] }

    constructor() {
        super() // always call super first

        // Required window event to inform all elements that require resizing after screen size changes
        if (!DataList.isWindowEventsBinded) {
            // console.log("binding window.onresize")
            window.addEventListener("resize", DataList.windowResizeHandler)
            DataList.isWindowEventsBinded = true
        }

        // is node mounted to the document
        // this.inDom = false

        // Create a shadow root
        this.attachShadow({
            mode: "open"
        }) // sets and returns "this.shadowRoot"

        // Create elements
        const article = document.createElement("article")

        // Event bindings (this fires before focusout)
        article.addEventListener("touchstart", (e) => {
            // console.log(e.type, "event bindings")
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
                    // console.log(e.type, "event bindings")
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

        // Create some CSS to apply to the shadow dom
        const style = document.createElement("style")

        // attach the created elements to the shadow DOM
        this.shadowRoot.append(style, article)
    }

    // life-cycle callback: invoked each time the custom element is appended into a document-connected element
    connectedCallback() {
        // console.log("Custom DataList element added to page", this.parentElement)
        this.updateStyle()
        this.updateBindings()
        // Note: problem with "this.children.length", is that it returns 0
        // it seems that this connectedCallback method is execute before the element really exist in the parent DOM
        // to counter this issue I use observer that checks that the node is inserted to the document and really exists
        // if (this.observer != null) this.observer.disconnect() // reset previous observer if exist
        // this.observer = new MutationObserver((mutations) => {
        //     this.inDom = document.body.contains(this)
        //     if (this.inDom) {
        //         this.observer.disconnect()
        //         // console.log("MutationObserver: Element exist in the DOM, stopping the observer")
        //         this.updateBindings()
        //     }
        // })
        // this.observer.observe(document.body, {
        //     childList: true,
        //     attributeFilter: ["data-list"]
        // })
        // Note: it's also possible to delay this process,
        // so the DOM is also updated before using,
        // but the MutationObserver will execute much earlier than this timeout
        //setTimeout(() => console.log("connectedCallback delayed:", this.children.length), 0)
    }

    // life-cycle callback: Invoked each time the custom element is disconnected from the document's DOM
    disconnectedCallback() {
        // console.log("Custom DataList element removed from page.")
        DataList.timeoutThrottleResize.timer = null
        window.clearTimeout(DataList.timeoutThrottleResize.timer)
        window.clearTimeout(DataList.timeoutDebounceInput)
        window.clearTimeout(DataList.timeoutInputFocusout)
        window.clearTimeout(DataList.timeoutMousedown)
        // if (this.observer != null) this.observer.disconnect()
    }

    // life-cycle callback: Invoked each time the custom element is moved to a new document
    // adoptedCallback() {
    //     console.log("Custom DataList element moved to new page.")
    // }

    // life-cycle callback: invoked when one of the custom element's attributes is added, removed, or changed
    // Note: requires static observedAttributes
    // attributeChangedCallback(name, oldValue, newValue) {
    //     console.log("Custom DataList element attributes changed.", name, oldValue, newValue)
    //     this.updateStyle()
    // }

    /** bind special events, like `input[list="myList"]` `focusin`, `focusout` */
    updateBindings() {
        if (!this.id) return console.warn("DataList web component does not have target 'id' set.")
        const shadow = this.shadowRoot
        /** @type {HTMLElement} */
        const article = shadow.querySelector("article")
        // console.log(`${this.id} event bindings`)

        // get list targets and update event bingings
        const targets = document.querySelectorAll(`input[list="${this.id}"]`)
        if (targets.length > 0) {
            // console.log("event bindings has targets:", targets.length)
            targets.forEach((target) => {
                // console.log("event bindings has target:", target)

                target.addEventListener("resize", (e) => {
                    // console.log(e.type, "event bindings")
                    window.clearTimeout(DataList.timeoutMousedown)
                    window.clearTimeout(DataList.timeoutInputFocusout)
                    //this.setAttribute("hidden", "")
                    this.updateSize(article, e.target)
                })

                // clicking the datalist will open the UI
                target.addEventListener("click", (e) => {
                    // console.log(e.type, "event bindings")
                    this.processChildElements()
                    this.removeAttribute("hidden")
                    this.updateSize(article, e.target)
                    // this.open(article, e.target.value)
                    this.filterRows(article, e.target.value)
                })

                // datalist focus does not open the UI
                // target.addEventListener("focusin", (e) => {
                //     // console.log(e.type, "event bindings")
                //     // this.processChildElements()
                //     this.removeAttribute("hidden")
                //     this.updateSize(article, e.target)
                //     this.open(article, e.target.value)
                //     // this.filterRows(article, e.target.value)
                // })

                target.addEventListener("focusout", (e) => {
                    // console.log(e.type, "event bindings")
                    window.clearTimeout(DataList.timeoutInputFocusout)
                    DataList.timeoutInputFocusout = window.setTimeout(() => { // delayed for the click event to pass-through
                        this.setAttribute("hidden", "")
                    }, 100)
                })

                // input event with debouncing
                target.addEventListener("input", (e) => {
                    if (!e.isTrusted) return // skip our emulated input event when selecting items from the list
                    clearTimeout(DataList.timeoutDebounceInput)
                    DataList.timeoutDebounceInput = setTimeout(() => {
                        this.removeAttribute("hidden")
                        this.filterRows(article, e.target.value)
                    }, 150)
                })
            })
        }
    }

    /** open the data-list view */
    // open(article, value) {
    //     if (DataList.timeoutDebounceOpen != null) return // is already in opening state
    //     clearTimeout(DataList.timeoutDebounceOpen)
    //     DataList.timeoutDebounceOpen = setTimeout(() => {
    //         DataList.timeoutDebounceOpen = null
    //         // console.log("open timeoutDebounceOpen")
    //         this.processChildElements()
    //         this.filterRows(article, value)
    //     }, 20)
    // }

    /**
     * create list items from child option elements
     */
    processChildElements() {
        // console.log("processChildElements")
        this.shadowRoot.querySelector("article").innerHTML = "" // clear all
        if (this.children.length) {
            for (const child of this.children) {
                // allow option element only
                if (child.tagName !== "OPTION") break
                let value = child.value
                let label = child.label // note: option.label will fallback to textContent as value(by the browser)

                // console.log(`creating child option:`, child, label)
                if (child.hasAttribute("label")) {
                    this.add([value, label, child.textContent]) // '' | ['value', 'label', 'textContent']
                } else {
                    this.add([value, child.textContent]) // '' | ['value', 'label']
                }
            }
        }
    }

    // filter rows by value
    filterRows(article, value) {
        //console.log("filterRows by search value:", value)
        const sValue = ("" + value).toLowerCase()
        let index = 0
        let lastVisibleChildIndex = -1
        const children = article.children
        // update section visibility
        for (let len = children.length; index < len; index++) {
            let child = children[index]
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
            children[lastVisibleChildIndex].classList.add("no-border-bottom") // CSS visible last border bottom
        } else {
            article.setAttribute("hidden", "")
        }
    }

    /**
     * update CSS height, position, etc.
     * 
     * @todo Enhance the max-height calculations
     * 
     * @param {*} article 
     * @param {*} target 
     */
    updateSize(article, target) {
        let clientHeight = window.innerHeight
        let rect = target.getBoundingClientRect()
        // make it begin at the element bottom
        article.style.top = `${rect.top + rect.height}px`
        article.style.left = `${rect.left}px`
        article.style.maxHeight = `calc(50vh - ${rect.top - window.scrollY}px - 1em)`
        article.style.width = `calc(100vw - ${rect.width}px)` // keep width limited
        article.style.maxWidth = `${rect.width}px`
        //console.log(`updateSize height:${height}; scrollY: ${window.scrollY}; rect:`, rect)
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
            article.style.top = "initial"
            article.style.bottom = `calc(100vh - ${rect.top + window.scrollY}px)`
        }
    }

    /** add items to the list */
    add(...values) {
        const shadow = this.shadowRoot
        const article = shadow.querySelector("article")
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

    /** add raw items to the list */
    addRaw(...values) {
        this.shadowRoot.querySelector("article").append(...values)
    }

    /** create row as section element */
    createSection(value, label, textContent) {
        // create option element for data-list
        // const option = document.createElement("option")
        // option.value = value
        // if (label != null && textContent != null) option.label = label
        // option.textContent = textContent != null ? textContent : label

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
        const rows = this.rows
        for (const row of rows) {
            row.remove()
        }
    }

    /** update CSS container */
    updateStyle() {
        //const wrapMaxHeight = this.hasAttribute("height") ? this.getAttribute("height") : "50vh"
        const shadow = this.shadowRoot
        shadow.querySelector("style").textContent = `
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
          }`
    }

    static windowResizeHandler(event) {
        DataList.timeoutThrottleResize.callback = () => {
            DataList.timeoutThrottleResize = null
            const targets = document.querySelectorAll("input[list]") // binded to these inputs
            for (const target of targets) {
                target.dispatchEvent(new Event("resize"))
            }
        }
        if (DataList.timeoutThrottleResize.timer != null) return
        DataList.timeoutThrottleResize.timer = setTimeout(DataList.timeoutThrottleResize.callback, DataList.timeoutThrottleResize.delay)
    }
}
customElements.define("data-list", DataList)