import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AlertasManutencaoService } from '../../services/alertas-manutencao.service';
import { AlertaManutencao, MotivoAlerta, StatusAlerta } from '../../models';

@Component({
  selector: 'app-alertas-manutencao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="alertas-page">
      <div class="page-header">
        <h1>Alertas de Manutenção</h1>
      </div>

      <div class="filters">
        <select [(ngModel)]="filtroStatus" (change)="carregarAlertas()">
          <option value="">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="ENVIADO">Enviado</option>
          <option value="FALHA">Falha</option>
        </select>
      </div>

      <div *ngIf="loading" class="loading">Carregando alertas...</div>

      <div *ngIf="!loading && erro" class="error-state">{{ erro }}</div>

      <table class="data-table" *ngIf="!loading && !erro && alertas.length > 0">
        <thead>
          <tr>
            <th>ID</th>
            <th>Veículo ID</th>
            <th>Placa</th>
            <th>Motivo</th>
            <th>Mensagem</th>
            <th>Status</th>
            <th>Tentativas</th>
            <th>Criado em</th>
            <th>Enviado em</th>
            <th>Erro</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let alerta of alertas">
            <td>{{ alerta.id }}</td>
            <td>{{ alerta.veiculoId }}</td>
            <td>{{ alerta.placa }}</td>
            <td>{{ rotuloMotivo(alerta.motivo) }}</td>
            <td>{{ alerta.mensagem }}</td>
            <td>
              <span class="status-badge" [ngClass]="'status-' + alerta.status">
                {{ alerta.status }}
              </span>
            </td>
            <td>{{ alerta.tentativas }}</td>
            <td>{{ alerta.dataCriacao | date:'dd/MM/yyyy HH:mm' }}</td>
            <td>{{ alerta.dataEnvio ? (alerta.dataEnvio | date:'dd/MM/yyyy HH:mm') : '-' }}</td>
            <td class="erro" [title]="alerta.detalheErro || ''">{{ alerta.detalheErro || '-' }}</td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="!loading && !erro && alertas.length === 0" class="empty-state">
        Nenhum alerta encontrado.
      </div>
    </div>
  `,
  styles: [`
    .alertas-page { padding: 20px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .page-header h1 { margin: 0; color: #333; font-size: 24px; }
    .filters { display: flex; gap: 12px; margin-bottom: 20px; }
    .filters select { padding: 10px 14px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
    .loading { text-align: center; padding: 40px; color: #666; }
    .error-state { text-align: center; padding: 40px; color: #c62828; background: #ffebee; border-radius: 12px; }
    .data-table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .data-table th { text-align: left; padding: 14px; background: #f5f5f5; color: #666; font-size: 13px; text-transform: uppercase; }
    .data-table td { padding: 14px; border-bottom: 1px solid #f5f5f5; font-size: 14px; }
    .data-table tr:hover { background: #f9f9f9; }
    .data-table td.erro { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #c62828; }
    .status-badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .status-PENDENTE { background: #fff3e0; color: #e65100; }
    .status-ENVIADO { background: #e8f5e9; color: #2e7d32; }
    .status-FALHA { background: #ffebee; color: #c62828; }
    .empty-state { text-align: center; padding: 40px; color: #999; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  `]
})
export class AlertasManutencaoComponent implements OnInit {
  alertas: AlertaManutencao[] = [];
  filtroStatus: StatusAlerta | '' = '';
  loading = true;
  erro: string | null = null;

  private static readonly MOTIVOS: Record<MotivoAlerta, string> = {
    QUILOMETRAGEM: 'Quilometragem',
    TEMPO: 'Tempo',
    QUILOMETRAGEM_E_TEMPO: 'Quilometragem e tempo'
  };

  constructor(private alertasService: AlertasManutencaoService) {}

  ngOnInit(): void {
    this.carregarAlertas();
  }

  async carregarAlertas(): Promise<void> {
    this.loading = true;
    this.erro = null;
    try {
      this.alertas = await firstValueFrom(
        this.alertasService.listar(this.filtroStatus || undefined)
      );
    } catch {
      this.alertas = [];
      this.erro = 'Não foi possível carregar os alertas. Verifique se a api-frotas está no ar.';
    } finally {
      this.loading = false;
    }
  }

  rotuloMotivo(motivo: MotivoAlerta): string {
    return AlertasManutencaoComponent.MOTIVOS[motivo] ?? motivo;
  }
}
