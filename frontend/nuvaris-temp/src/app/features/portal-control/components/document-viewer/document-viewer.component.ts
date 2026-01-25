/**
 * PORTAL CONTROL - Document Viewer Component
 * Displays and allows inspection of visitor documents
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VisitorDocuments, DimensionalPassport, DocumentError } from '../../models';

@Component({
  selector: 'app-document-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="document-viewer" [class.has-documents]="documents">
      <!-- Document tabs -->
      <div class="doc-tabs">
        <button class="tab"
                [class.active]="activeTab === 'passport'"
                (click)="activeTab = 'passport'"
                [disabled]="!documents?.passport">
          📘 Pasaporte
        </button>
        <button class="tab"
                [class.active]="activeTab === 'visa'"
                (click)="activeTab = 'visa'"
                [disabled]="!documents?.visa">
          📋 Visa
        </button>
        <button class="tab"
                [class.active]="activeTab === 'health'"
                (click)="activeTab = 'health'"
                [disabled]="!documents?.healthCertificate">
          🏥 Salud
        </button>
      </div>

      <!-- Document display -->
      <div class="doc-content" [class.zoomed]="isZoomed">
        @if (documents?.passport && activeTab === 'passport') {
          <div class="passport-doc" [class.marked]="documents.passport.isMarked">
            <!-- Header -->
            <div class="doc-header">
              <div class="doc-title">PASAPORTE DIMENSIONAL</div>
              <div class="doc-number">{{ documents.passport.documentNumber }}</div>
            </div>

            <!-- Photo section -->
            <div class="photo-section">
              <div class="photo-frame">
                <div class="photo-placeholder">
                  <span class="photo-species">{{ documents.passport.holderSpecies }}</span>
                  <span class="photo-eyes">👁️ × {{ documents.passport.photo.eyeCount }}</span>
                </div>
              </div>
              <div class="photo-info">
                <div class="info-row">
                  <span class="label">Nombre:</span>
                  <span class="value">{{ documents.passport.holderName }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Especie:</span>
                  <span class="value">{{ documents.passport.holderSpecies }}</span>
                </div>
              </div>
            </div>

            <!-- Data section -->
            <div class="data-section">
              <div class="data-row">
                <span class="label">Origen:</span>
                <span class="value">{{ documents.passport.holderOriginCity }}, {{ documents.passport.holderOriginWorld }}</span>
              </div>
              <div class="data-row">
                <span class="label">Altura:</span>
                <span class="value" [class.suspicious]="hasHeightDiscrepancy()">
                  {{ documents.passport.registeredHeight }}m
                </span>
              </div>
              <div class="data-row">
                <span class="label">Peso:</span>
                <span class="value" [class.suspicious]="hasWeightDiscrepancy()">
                  {{ documents.passport.registeredWeight }}kg
                </span>
              </div>
              <div class="data-row">
                <span class="label">Sangre:</span>
                <span class="value">{{ documents.passport.bloodType }}</span>
              </div>
              @if (documents.passport.ulnarCount !== undefined) {
                <div class="data-row">
                  <span class="label">Ulnar:</span>
                  <span class="value">{{ documents.passport.ulnarCount }}</span>
                </div>
              }
              @if (documents.passport.casteCode) {
                <div class="data-row">
                  <span class="label">Colmena:</span>
                  <span class="value" [class.suspicious]="documents.passport.casteCode === '000000'">
                    #{{ documents.passport.casteCode }}
                  </span>
                </div>
              }
            </div>

            <!-- Dates section -->
            <div class="dates-section">
              <div class="date-item">
                <span class="label">Emisión:</span>
                <span class="value">{{ documents.passport.issueDate }}</span>
              </div>
              <div class="date-item">
                <span class="label">Expiración:</span>
                <span class="value" [class.expired]="isExpired(documents.passport.expirationDate)">
                  {{ documents.passport.expirationDate }}
                </span>
              </div>
            </div>

            <!-- Authority & Seal -->
            <div class="seal-section">
              <div class="authority">
                <span class="label">Autoridad:</span>
                <span class="value" [class.suspicious]="!documents.passport.issuingAuthority.isValid">
                  {{ documents.passport.issuingAuthority.name }}
                </span>
              </div>
              <div class="seal" [class.invalid]="!documents.passport.signatureVerified">
                🔏 {{ documents.passport.issuingAuthority.sealCode }}
              </div>
            </div>

            <!-- Dimensional signature -->
            <div class="signature-section">
              <span class="label">Firma Dimensional:</span>
              <span class="signature-code">{{ documents.passport.dimensionalSignature }}</span>
              <span class="verify-status" [class.valid]="documents.passport.signatureVerified">
                {{ documents.passport.signatureVerified ? '✓' : '?' }}
              </span>
            </div>

            <!-- Errors indicator (only visible if examining closely) -->
            @if (showErrors && documents.passport.errors.length > 0) {
              <div class="errors-overlay">
                @for (error of documents.passport.errors; track error.field) {
                  <div class="error-marker" [attr.data-severity]="error.severity">
                    ⚠️ {{ error.field }}: {{ error.actualValue }}
                  </div>
                }
              </div>
            }
          </div>
        }

        @if (documents?.visa && activeTab === 'visa') {
          <div class="visa-doc">
            <div class="doc-header">
              <div class="doc-title">{{ getVisaTitle() }}</div>
              <div class="doc-number">{{ documents.visa.documentNumber }}</div>
            </div>

            <div class="visa-content">
              <div class="data-row">
                <span class="label">Titular:</span>
                <span class="value">{{ documents.visa.holderName }}</span>
              </div>
              <div class="data-row">
                <span class="label">Válida hasta:</span>
                <span class="value">{{ documents.visa.expirationDate }}</span>
              </div>

              @if (documents.visa.type === 'VISA_TRABAJO') {
                <div class="data-row">
                  <span class="label">Empleador:</span>
                  <span class="value">{{ $any(documents.visa).employerName }}</span>
                </div>
                <div class="data-row">
                  <span class="label">Cargo:</span>
                  <span class="value">{{ $any(documents.visa).jobTitle }}</span>
                </div>
              }

              @if (documents.visa.type === 'VISA_TURISMO') {
                <div class="data-row">
                  <span class="label">Duración máx:</span>
                  <span class="value">{{ $any(documents.visa).maxDuration }}</span>
                </div>
              }

              @if (documents.visa.type === 'VISA_REFUGIADO') {
                <div class="data-row">
                  <span class="label">Huyendo de:</span>
                  <span class="value">{{ $any(documents.visa).fleeingFrom }}</span>
                </div>
                <div class="data-row">
                  <span class="label">Razón:</span>
                  <span class="value">{{ $any(documents.visa).reason }}</span>
                </div>
              }
            </div>

            <div class="seal-section">
              <div class="seal">
                🔏 {{ documents.visa.issuingAuthority.sealCode }}
              </div>
            </div>
          </div>
        }

        @if (documents?.healthCertificate && activeTab === 'health') {
          <div class="health-doc">
            <div class="doc-header">
              <div class="doc-title">CERTIFICADO DE SALUD</div>
              <div class="doc-number">{{ documents.healthCertificate.documentNumber }}</div>
            </div>

            <div class="health-content">
              <div class="data-row">
                <span class="label">Examinado:</span>
                <span class="value">{{ documents.healthCertificate.examDate }}</span>
              </div>
              <div class="data-row">
                <span class="label">Doctor:</span>
                <span class="value">{{ documents.healthCertificate.doctorName }}</span>
              </div>
              <div class="data-row">
                <span class="label">Estado:</span>
                <span class="value" [class.healthy]="documents.healthCertificate.isHealthy"
                      [class.unhealthy]="!documents.healthCertificate.isHealthy">
                  {{ documents.healthCertificate.isHealthy ? 'SALUDABLE' : 'REQUIERE ATENCIÓN' }}
                </span>
              </div>
              <div class="data-row">
                <span class="label">Radiación:</span>
                <span class="value" [class.danger]="documents.healthCertificate.radiationLevel !== 'SAFE'">
                  {{ documents.healthCertificate.radiationLevel }}
                </span>
              </div>
              <div class="data-row">
                <span class="label">Parásitos:</span>
                <span class="value" [class.danger]="documents.healthCertificate.parasiteCheck === 'POSITIVE'">
                  {{ documents.healthCertificate.parasiteCheck }}
                </span>
              </div>
              @if (documents.healthCertificate.quarantineRequired) {
                <div class="quarantine-alert">
                  ⚠️ CUARENTENA REQUERIDA: {{ documents.healthCertificate.quarantineDays }} días
                </div>
              }
            </div>
          </div>
        }

        @if (!documents) {
          <div class="no-documents">
            <div class="empty-icon">📄</div>
            <p>Sin documentos para revisar</p>
          </div>
        }
      </div>

      <!-- Viewer controls -->
      <div class="viewer-controls">
        <button class="control-btn" (click)="toggleZoom()" [class.active]="isZoomed">
          🔍 {{ isZoomed ? 'Normal' : 'Zoom' }}
        </button>
        <button class="control-btn" (click)="toggleErrors()" [class.active]="showErrors">
          ⚠️ Errores
        </button>
        <button class="control-btn" (click)="markDocument()" *ngIf="documents">
          ✏️ Marcar
        </button>
      </div>
    </div>
  `,
  styles: [`
    .document-viewer {
      width: 350px;
      height: 500px;
      background: #1a1a2e;
      border: 2px solid #333;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .doc-tabs {
      display: flex;
      background: #222;
      border-bottom: 2px solid #333;
    }

    .tab {
      flex: 1;
      padding: 10px;
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }

    .tab:hover:not(:disabled) {
      background: #2a2a3e;
      color: #aaa;
    }

    .tab.active {
      background: #2a2a3e;
      color: white;
      border-bottom: 2px solid #4CAF50;
    }

    .tab:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .doc-content {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      transition: transform 0.3s;
    }

    .doc-content.zoomed {
      transform: scale(1.2);
      transform-origin: top center;
    }

    .passport-doc, .visa-doc, .health-doc {
      background: linear-gradient(135deg, #f5f5dc 0%, #e8e8d0 100%);
      color: #333;
      padding: 16px;
      border-radius: 4px;
      font-size: 12px;
      position: relative;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .passport-doc.marked::after {
      content: '✓ MARCADO';
      position: absolute;
      top: 10px;
      right: 10px;
      background: red;
      color: white;
      padding: 2px 6px;
      font-size: 10px;
      border-radius: 2px;
    }

    .doc-header {
      text-align: center;
      border-bottom: 1px solid #999;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }

    .doc-title {
      font-weight: bold;
      font-size: 14px;
      color: #1a1a2e;
      letter-spacing: 2px;
    }

    .doc-number {
      font-size: 10px;
      color: #666;
      margin-top: 4px;
    }

    .photo-section {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
    }

    .photo-frame {
      width: 80px;
      height: 100px;
      background: #ddd;
      border: 2px solid #999;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .photo-placeholder {
      text-align: center;
      font-size: 10px;
      color: #666;
    }

    .photo-species {
      display: block;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .photo-info {
      flex: 1;
    }

    .info-row, .data-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .label {
      color: #666;
      font-size: 10px;
    }

    .value {
      font-weight: 500;
    }

    .value.suspicious {
      color: #F44336;
      font-weight: bold;
    }

    .value.expired {
      color: #F44336;
      text-decoration: line-through;
    }

    .data-section {
      background: rgba(0,0,0,0.05);
      padding: 8px;
      border-radius: 4px;
      margin-bottom: 12px;
    }

    .dates-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .seal-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 8px;
      border-top: 1px dashed #999;
    }

    .seal {
      background: #1a1a2e;
      color: gold;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
    }

    .seal.invalid {
      background: #F44336;
      color: white;
    }

    .signature-section {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid #999;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .signature-code {
      font-family: monospace;
      font-size: 10px;
      background: #eee;
      padding: 2px 6px;
      border-radius: 2px;
    }

    .verify-status {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #F44336;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }

    .verify-status.valid {
      background: #4CAF50;
    }

    .errors-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(244,67,54,0.1);
      pointer-events: none;
      padding: 8px;
    }

    .error-marker {
      background: rgba(244,67,54,0.9);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      margin-bottom: 4px;
    }

    .visa-content, .health-content {
      padding: 12px 0;
    }

    .healthy {
      color: #4CAF50;
      font-weight: bold;
    }

    .unhealthy, .danger {
      color: #F44336;
      font-weight: bold;
    }

    .quarantine-alert {
      background: #FFC107;
      color: #333;
      padding: 8px;
      border-radius: 4px;
      margin-top: 12px;
      text-align: center;
      font-weight: bold;
    }

    .no-documents {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #666;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .viewer-controls {
      display: flex;
      gap: 8px;
      padding: 12px;
      background: #222;
      border-top: 2px solid #333;
    }

    .control-btn {
      flex: 1;
      padding: 8px;
      background: #333;
      border: 1px solid #444;
      border-radius: 4px;
      color: #aaa;
      cursor: pointer;
      font-size: 11px;
      transition: all 0.2s;
    }

    .control-btn:hover {
      background: #444;
      color: white;
    }

    .control-btn.active {
      background: #4CAF50;
      border-color: #4CAF50;
      color: white;
    }
  `]
})
export class DocumentViewerComponent {
  @Input() documents: VisitorDocuments | null = null;
  @Input() visitorWeight: number = 0;
  @Input() visitorHeight: number = 0;
  @Output() onMark = new EventEmitter<string>();

  activeTab: 'passport' | 'visa' | 'health' = 'passport';
  isZoomed = false;
  showErrors = false;

  toggleZoom(): void {
    this.isZoomed = !this.isZoomed;
  }

  toggleErrors(): void {
    this.showErrors = !this.showErrors;
  }

  markDocument(): void {
    if (this.documents?.passport) {
      this.documents.passport.isMarked = !this.documents.passport.isMarked;
      this.onMark.emit(this.documents.passport.id);
    }
  }

  getVisaTitle(): string {
    if (!this.documents?.visa) return 'VISA';
    const titles: Record<string, string> = {
      VISA_TRABAJO: 'VISA DE TRABAJO',
      VISA_TURISMO: 'VISA DE TURISMO',
      VISA_REFUGIADO: 'VISA DE REFUGIADO',
      VISA_DIPLOMATICA: 'VISA DIPLOMÁTICA',
    };
    return titles[this.documents.visa.type] || 'VISA';
  }

  isExpired(dateStr: string): boolean {
    // Check if date is before current cycle (3042)
    const match = dateStr.match(/Ciclo (\d+)/);
    if (match) {
      return parseInt(match[1]) < 3042;
    }
    return false;
  }

  hasWeightDiscrepancy(): boolean {
    if (!this.documents?.passport || !this.visitorWeight) return false;
    return Math.abs(this.documents.passport.registeredWeight - this.visitorWeight) > 5;
  }

  hasHeightDiscrepancy(): boolean {
    if (!this.documents?.passport || !this.visitorHeight) return false;
    return Math.abs(this.documents.passport.registeredHeight - this.visitorHeight) > 0.05;
  }
}
