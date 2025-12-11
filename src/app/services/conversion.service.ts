import { Injectable } from '@angular/core';

export interface ConversionResult {
  success: boolean;
  data?: string;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConversionService {

  /**
   * Validates if a string is valid JSON
   */
  validateJson(input: string): ValidationResult {
    if (!input.trim()) {
      return { valid: true };
    }
    
    try {
      JSON.parse(input);
      return { valid: true };
    } catch (e) {
      return { 
        valid: false, 
        error: `Invalid JSON: ${(e as Error).message}` 
      };
    }
  }

  /**
   * Validates if a string is valid XML
   */
  validateXml(input: string): ValidationResult {
    if (!input.trim()) {
      return { valid: true };
    }
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(input, 'text/xml');
      
      // Check for parsing errors
      const parserError = xmlDoc.getElementsByTagName('parsererror');
      if (parserError.length > 0) {
        return { 
          valid: false, 
          error: `Invalid XML: ${parserError[0].textContent}` 
        };
      }
      
      return { valid: true };
    } catch (e) {
      return { 
        valid: false, 
        error: `Invalid XML: ${(e as Error).message}` 
      };
    }
  }

  /**
   * Converts JSON string to XML format
   */
  jsonToXml(jsonString: string): ConversionResult {
    try {
      if (!jsonString.trim()) {
        return { success: true, data: '' };
      }

      const jsonObj = JSON.parse(jsonString);
      const xml = this.objectToXml(jsonObj, 'root');
      
      // Format XML with proper indentation
      const formatted = this.formatXml(xml);
      
      return { success: true, data: formatted };
    } catch (e) {
      return { 
        success: false, 
        error: `Conversion failed: ${(e as Error).message}` 
      };
    }
  }

  /**
   * Converts XML string to JSON format
   */
  xmlToJson(xmlString: string): ConversionResult {
    try {
      if (!xmlString.trim()) {
        return { success: true, data: '' };
      }

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      
      // Check for parsing errors
      const parserError = xmlDoc.getElementsByTagName('parsererror');
      if (parserError.length > 0) {
        return { 
          success: false, 
          error: `XML parsing failed: ${parserError[0].textContent}` 
        };
      }

      const jsonObj = this.xmlNodeToObject(xmlDoc.documentElement);
      const jsonString = JSON.stringify(jsonObj, null, 2);
      
      return { success: true, data: jsonString };
    } catch (e) {
      return { 
        success: false, 
        error: `Conversion failed: ${(e as Error).message}` 
      };
    }
  }

  /**
   * Converts a JavaScript object to XML string recursively
   */
  private objectToXml(obj: any, rootName: string): string {
    const doc = document.implementation.createDocument('', '', null);
    
    const buildElement = (data: any, nodeName: string, parentElement?: Element): Element => {
      const element = doc.createElement(nodeName);
      
      // Handle null and undefined
      if (data === null || data === undefined) {
        if (parentElement) parentElement.appendChild(element);
        return element;
      }

      // Handle primitive types
      if (typeof data !== 'object') {
        element.textContent = String(data);
        if (parentElement) parentElement.appendChild(element);
        return element;
      }

      // Handle arrays
      if (Array.isArray(data)) {
        // For arrays, create multiple elements with the same name
        data.forEach(item => {
          buildElement(item, nodeName, parentElement);
        });
        return element; // Return empty element, actual elements already added to parent
      }

      // Handle objects
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
          value.forEach(item => {
            buildElement(item, key, element);
          });
        } else {
          buildElement(value, key, element);
        }
      }
      
      if (parentElement) parentElement.appendChild(element);
      return element;
    };

    const rootElement = buildElement(obj, rootName);
    doc.appendChild(rootElement);
    
    const serializer = new XMLSerializer();
    const xmlString = serializer.serializeToString(doc);
    
    return xmlString;
  }

  /**
   * Converts an XML node to a JavaScript object recursively
   */
  private xmlNodeToObject(node: Element): any {
    const obj: any = {};

    // Handle attributes
    if (node.attributes.length > 0) {
      obj['@attributes'] = {};
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        obj['@attributes'][attr.name] = attr.value;
      }
    }

    // Handle child nodes
    if (node.hasChildNodes()) {
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];

        // Skip empty text nodes
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent?.trim();
          if (text) {
            // If node only has text content and no child elements
            if (node.childNodes.length === 1 || 
                (node.childNodes.length === node.querySelectorAll('*').length + 1)) {
              return this.parseValue(text);
            }
            obj['#text'] = text;
          }
          continue;
        }

        if (child.nodeType === Node.ELEMENT_NODE) {
          const childElement = child as Element;
          const childName = childElement.nodeName;
          const childValue = this.xmlNodeToObject(childElement);

          // Handle multiple children with same name (arrays)
          if (obj[childName]) {
            if (!Array.isArray(obj[childName])) {
              obj[childName] = [obj[childName]];
            }
            obj[childName].push(childValue);
          } else {
            obj[childName] = childValue;
          }
        }
      }
    }

    return Object.keys(obj).length === 0 ? '' : obj;
  }

  /**
   * Tries to parse string values to their appropriate types
   */
  private parseValue(value: string): any {
    // Try to parse as number
    if (!isNaN(Number(value)) && value.trim() !== '') {
      return Number(value);
    }

    // Try to parse as boolean
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;

    return value;
  }



  /**
   * Formats XML string with proper indentation
   */
  private formatXml(xml: string): string {
    const PADDING = '  ';
    const reg = /(>)(<)(\/*)/g;
    let pad = 0;

    xml = xml.replace(reg, '$1\n$2$3');

    return xml.split('\n').map((node) => {
      let indent = 0;
      if (node.match(/.+<\/\w[^>]*>$/)) {
        indent = 0;
      } else if (node.match(/^<\/\w/) && pad > 0) {
        pad -= 1;
      } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
        indent = 1;
      } else {
        indent = 0;
      }

      const padding = PADDING.repeat(pad);
      pad += indent;

      return padding + node;
    }).join('\n');
  }
}
