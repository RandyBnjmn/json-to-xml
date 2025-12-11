import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ConversionService } from './services/conversion.service';

type ConversionMode = 'json-to-xml' | 'xml-to-json';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'JSON ⇄ XML Converter';
  
  leftInput = '';
  rightOutput = '';
  errorMessage = '';
  conversionMode: ConversionMode = 'json-to-xml';
  
  private leftInputSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Placeholder examples
  private readonly jsonPlaceholder = `{
  "person": {
    "name": "John Doe",
    "age": 30,
    "email": "john@example.com",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "country": "USA"
    },
    "hobbies": ["reading", "coding", "gaming"]
  }
}`;

  private readonly xmlPlaceholder = `<?xml version="1.0" encoding="UTF-8"?>
<person>
  <name>John Doe</name>
  <age>30</age>
  <email>john@example.com</email>
  <address>
    <street>123 Main St</street>
    <city>New York</city>
    <country>USA</country>
  </address>
  <hobbies>reading</hobbies>
  <hobbies>coding</hobbies>
  <hobbies>gaming</hobbies>
</person>`;

  constructor(private conversionService: ConversionService) {}

  ngOnInit(): void {
    // Set initial placeholder based on mode
    this.updatePlaceholders();

    // Setup debounced conversion
    this.leftInputSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((input) => {
        this.performConversion(input);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Called when user types in the left panel
   */
  onLeftInputChange(value: string): void {
    this.leftInput = value;
    this.leftInputSubject.next(value);
  }

  /**
   * Toggles between JSON→XML and XML→JSON modes
   */
  toggleMode(): void {
    this.conversionMode = this.conversionMode === 'json-to-xml' 
      ? 'xml-to-json' 
      : 'json-to-xml';
    
    // Swap input and output
    const temp = this.leftInput;
    this.leftInput = this.rightOutput;
    this.rightOutput = temp;
    
    // Clear error and update placeholders
    this.errorMessage = '';
    this.updatePlaceholders();
    
    // Trigger conversion if there's input
    if (this.leftInput.trim()) {
      this.performConversion(this.leftInput);
    }
  }

  /**
   * Gets the appropriate placeholder for left panel
   */
  get leftPlaceholder(): string {
    return this.conversionMode === 'json-to-xml' 
      ? this.jsonPlaceholder 
      : this.xmlPlaceholder;
  }

  /**
   * Gets the appropriate placeholder for right panel
   */
  get rightPlaceholder(): string {
    return this.conversionMode === 'json-to-xml' 
      ? this.xmlPlaceholder 
      : this.jsonPlaceholder;
  }

  /**
   * Gets the label for left panel
   */
  get leftLabel(): string {
    return this.conversionMode === 'json-to-xml' ? 'JSON Input' : 'XML Input';
  }

  /**
   * Gets the label for right panel
   */
  get rightLabel(): string {
    return this.conversionMode === 'json-to-xml' ? 'XML Output' : 'JSON Output';
  }

  /**
   * Updates placeholders when mode changes
   */
  private updatePlaceholders(): void {
    // If input is empty, show placeholder example
    if (!this.leftInput.trim()) {
      this.leftInput = '';
      this.rightOutput = '';
    }
  }

  /**
   * Performs the actual conversion based on current mode
   */
  private performConversion(input: string): void {
    this.errorMessage = '';

    if (!input.trim()) {
      this.rightOutput = '';
      return;
    }

    if (this.conversionMode === 'json-to-xml') {
      // Validate JSON first
      const validation = this.conversionService.validateJson(input);
      if (!validation.valid) {
        this.errorMessage = validation.error || 'Invalid JSON';
        this.rightOutput = '';
        return;
      }

      // Convert JSON to XML
      const result = this.conversionService.jsonToXml(input);
      if (result.success && result.data) {
        this.rightOutput = result.data;
      } else {
        this.errorMessage = result.error || 'Conversion failed';
        this.rightOutput = '';
      }
    } else {
      // Validate XML first
      const validation = this.conversionService.validateXml(input);
      if (!validation.valid) {
        this.errorMessage = validation.error || 'Invalid XML';
        this.rightOutput = '';
        return;
      }

      // Convert XML to JSON
      const result = this.conversionService.xmlToJson(input);
      if (result.success && result.data) {
        this.rightOutput = result.data;
      } else {
        this.errorMessage = result.error || 'Conversion failed';
        this.rightOutput = '';
      }
    }
  }

  /**
   * Clears all inputs and outputs
   */
  clearAll(): void {
    this.leftInput = '';
    this.rightOutput = '';
    this.errorMessage = '';
  }

  /**
   * Loads example data
   */
  loadExample(): void {
    if (this.conversionMode === 'json-to-xml') {
      this.leftInput = this.jsonPlaceholder;
    } else {
      this.leftInput = this.xmlPlaceholder;
    }
    this.leftInputSubject.next(this.leftInput);
  }
}
