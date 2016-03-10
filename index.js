function reparentChildren(oldNode, newNode) {
    while (oldNode.childNodes.length > 0) {
        newNode.appendChild(oldNode.childNodes[0]);
    }
}

function renameNode(node, newName) {
    var newNode = document.createElement(newName);
    newNode.attributes = node.attributes;
    node.parentNode.replaceChild(newNode, node);
    reparentChildren(node, newNode);
    return newNode;
}

function removeWrapperNode(node) {
    while(node.childNodes.length) {
        node.parentNode.insertBefore(node.childNodes[0], node);
    }
    node.parentNode.removeChild(node);
}

function removeAttributes(node) {
    while (node.attributes.length) {
        node.removeAttribute(node.attributes[0].name);
    }
}

function nextElementSibling(node) {
    var sibling = node.nextSibling;
    while (sibling && sibling.nodeType !== document.ELEMENT_NODE) {
        if (sibling.nodeType === document.TEXT_NODE && !/^[\s\n]*$/.test(sibling.textContent)) {
            // Don't skip over non-ws text.
            return null;
        }
        sibling = sibling.nextSibling
    }
    return sibling === node ? null : sibling;
}

function massageNode(node) {
    switch(node.nodeName) {
        case 'STRONG':
            node = renameNode(node, 'b');
            removeAttributes(node);
            break;
        case 'DIV':
            node = renameNode(node, 'p');
            removeAttributes(node);
            break;
        case 'SPAN':
            // Check if followed by ws & two <br>, and convert to <p> if that's
            // the case. This is common with GMail.
            var nextElement = nextElementSibling(node);
            console.log(nextElement);
            nextElement = nextElement && nextElementSibling(node);
            if (nextElement && nextElement.nodeName === 'BR') {
                node = renameNode(node, 'p');
                removeAttributes(node);
            } else {
                removeWrapperNode(node);
                return -1;
            }
            break;
        case 'BR':
            // TODO: Preserve some more double-br sequences in GMail HTML.
            // Wrap preceding text node(s) in <p>?
        case 'ASIDE':
        case 'WBR':
        case 'SECTION':
        case 'HEADER':
        case 'TIME':
            // Replace with its children
            removeWrapperNode(node);
            return -1;
        case 'SVG':
        case 'svg':
        case 'IFRAME':
            // Remove completely
            node.parentNode.removeChild(node);
            return -1;
        case 'CODE':
        case 'P':
            removeAttributes(node);
            break;
        case 'A':
            // Strip links without href
            if (node.getAttribute('href') === null) {
                node.parentNode.removeChild(node);
                return -1;
            }
    }

    if (node.nodeType === document.ELEMENT_NODE) {
        // Remove inline styles.
        node.removeAttribute('style');

        // Recurse.
        for (var i = 0; i < node.childNodes.length; i++) {
            i += massageNode(node.childNodes[i]);
        }
    } else if (node.nodeType === document.TEXT_NODE) {
        if (node.parentNode.nodeName !== 'PRE') {
            // Remove indents outside of preformatted text
            node.textContent = node.textContent.replace(/\n[ \t]+(?=[^ \t\n])/g, '$1');
        }
    }
    return 0;
}

function massageHTML(node) {
    for (var i = 0; i < node.childNodes.length; i++) {
        i += massageNode(node.childNodes[i]);
    }
}

function convert() {
    var data = new FormData();
    var htmlContentNode = document.getElementById('editable');
    massageHTML(htmlContentNode);
    data.append('html', htmlContentNode.innerHTML);
    data.append('scrub_wikitext', 'true');
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://en.wikipedia.org/api/rest_v1/transform/html/to/wikitext', true);
    xhr.onload = function () {
        // do something to response
        document.getElementById('output').value = this.responseText
    };
    xhr.send(data);
}
