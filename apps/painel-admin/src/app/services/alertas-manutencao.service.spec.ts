import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AlertasManutencaoService } from './alertas-manutencao.service';
import { AlertaManutencao } from '../models';

const alerta: AlertaManutencao = {
  id: 1,
  veiculoId: 10,
  placa: 'ABC1D23',
  motivo: 'QUILOMETRAGEM',
  mensagem: 'Agendar manutenção preventiva.',
  status: 'PENDENTE',
  detalheErro: null,
  tentativas: 1,
  dataCriacao: '2026-11-16T18:10:58',
  dataEnvio: null
};

describe('AlertasManutencaoService', () => {
  let service: AlertasManutencaoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AlertasManutencaoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista todos os alertas sem o parâmetro status', () => {
    let resultado: AlertaManutencao[] = [];
    service.listar().subscribe((r) => (resultado = r));

    const req = http.expectOne('http://localhost:8080/api/alertas-manutencao');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('status')).toBe(false);
    req.flush([alerta]);

    expect(resultado).toEqual([alerta]);
  });

  it('envia o status como query param quando informado', () => {
    service.listar('PENDENTE').subscribe();

    const req = http.expectOne(
      (r) => r.url === 'http://localhost:8080/api/alertas-manutencao'
    );
    expect(req.request.params.get('status')).toBe('PENDENTE');
    req.flush([]);
  });
});
