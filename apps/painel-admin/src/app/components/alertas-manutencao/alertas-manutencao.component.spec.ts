import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AlertasManutencaoComponent } from './alertas-manutencao.component';
import { AlertasManutencaoService } from '../../services/alertas-manutencao.service';
import { AlertaManutencao } from '../../models';

const pendente: AlertaManutencao = {
  id: 1,
  veiculoId: 10,
  placa: 'ABC1D23',
  motivo: 'QUILOMETRAGEM',
  mensagem: 'Veículo ABC1D23 precisa de manutenção.',
  status: 'PENDENTE',
  detalheErro: 'ResourceAccessException: Connection refused',
  tentativas: 2,
  dataCriacao: '2026-11-16T18:10:58',
  dataEnvio: null
};

const enviado: AlertaManutencao = {
  ...pendente,
  id: 2,
  placa: 'XYZ9K88',
  motivo: 'QUILOMETRAGEM_E_TEMPO',
  status: 'ENVIADO',
  detalheErro: null,
  tentativas: 1,
  dataEnvio: '2026-11-16T18:11:00'
};

describe('AlertasManutencaoComponent', () => {
  let fixture: ComponentFixture<AlertasManutencaoComponent>;
  let listar: jest.Mock;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const linhas = (): HTMLElement[] => Array.from(el().querySelectorAll('tbody tr'));

  async function atualizar(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function criar(): Promise<void> {
    fixture = TestBed.createComponent(AlertasManutencaoComponent);
    fixture.detectChanges();
    await atualizar();
  }

  async function escolherStatus(valor: string): Promise<void> {
    const select = el().querySelector('select') as HTMLSelectElement;
    select.value = valor;
    select.dispatchEvent(new Event('change'));
    await atualizar();
  }

  beforeEach(async () => {
    listar = jest.fn().mockReturnValue(of([pendente, enviado]));
    await TestBed.configureTestingModule({
      imports: [AlertasManutencaoComponent],
      providers: [{ provide: AlertasManutencaoService, useValue: { listar } }]
    }).compileComponents();
  });

  it('carrega todos os alertas ao abrir, sem filtro', async () => {
    await criar();

    expect(listar).toHaveBeenCalledWith(undefined);
    expect(linhas()).toHaveLength(2);
    expect(linhas()[0].textContent).toContain('ABC1D23');
    expect(linhas()[0].textContent).toContain('Quilometragem');
    expect(linhas()[0].textContent).toContain('Connection refused');
    expect(linhas()[1].textContent).toContain('Quilometragem e tempo');
  });

  it('mostra o status como badge com a classe da situação', async () => {
    await criar();

    const badges = el().querySelectorAll('.status-badge');
    expect(badges[0].classList).toContain('status-PENDENTE');
    expect(badges[1].classList).toContain('status-ENVIADO');
  });

  it('recarrega pela api com o status escolhido no select', async () => {
    await criar();
    listar.mockReturnValue(of([pendente]));

    await escolherStatus('PENDENTE');

    expect(listar).toHaveBeenLastCalledWith('PENDENTE');
    expect(linhas()).toHaveLength(1);
  });

  it('volta a listar sem filtro ao escolher "Todos os status"', async () => {
    await criar();
    await escolherStatus('FALHA');
    expect(listar).toHaveBeenLastCalledWith('FALHA');

    await escolherStatus('');

    expect(listar).toHaveBeenLastCalledWith(undefined);
  });

  it('mostra estado vazio quando não há alertas', async () => {
    listar.mockReturnValue(of([]));
    await criar();

    expect(el().querySelector('.empty-state')?.textContent).toContain('Nenhum alerta encontrado');
    expect(el().querySelector('table')).toBeNull();
  });

  it('mostra mensagem de erro quando a api falha', async () => {
    listar.mockReturnValue(throwError(() => new Error('rede')));
    await criar();

    expect(el().querySelector('.error-state')?.textContent).toContain('Não foi possível carregar');
    expect(el().querySelector('.empty-state')).toBeNull();
  });
});
