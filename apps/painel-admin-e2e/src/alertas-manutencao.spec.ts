import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * End-to-end do alerta de manutenção preventiva, atravessando os três serviços:
 *   api-frotas (verifica elegibilidade, registra o alerta)
 *     -> api-notificacoes (envia o e-mail ao gestor)
 *   -> painel-admin (lista os alertas filtrando por status)
 *
 * Pré-requisitos (nesta ordem): docker do rotalog-workspace no ar (banco com os scripts 10, 11 e 12),
 * api-frotas em :8080 e api-notificacoes em :5000. O painel (:4200) sobe sozinho via webServer do Playwright.
 *
 * O envio de e-mail da api-notificacoes é simulado com falha aleatória; quando o alerta fica PENDENTE o teste
 * usa o reprocessamento, que é justamente o comportamento esperado do fluxo.
 */
const FROTAS = 'http://localhost:8080/api';
const NOTIFICACOES = 'http://localhost:5000/api';

interface Alerta {
  id: number;
  placa: string;
  motivo: string;
  status: 'PENDENTE' | 'ENVIADO' | 'FALHA';
  tentativas: number;
}

function placaAleatoria(): string {
  const letra = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const digito = () => String(Math.floor(Math.random() * 10));
  return `${letra()}${letra()}${letra()}${digito()}${letra()}${digito()}${digito()}`;
}

async function criarVeiculoElegivel(request: APIRequestContext, placa: string): Promise<number> {
  // Veículo novo, sem nenhuma manutenção, com 50.000 km: acima do limite de 10.000 km.
  // A criação grava a quilometragem como 0, então os km são informados em seguida.
  const resposta = await request.post(`${FROTAS}/veiculos`, {
    data: { placa, modelo: 'Veículo E2E', anoFabricacao: 2022 }
  });
  expect(resposta.status(), await resposta.text()).toBe(201);
  const id = (await resposta.json()).id as number;

  const km = await request.patch(`${FROTAS}/veiculos/${id}/quilometragem`, {
    data: { quilometragem: 50000 }
  });
  expect(km.ok(), await km.text()).toBeTruthy();
  return id;
}

async function alertaDe(request: APIRequestContext, placa: string): Promise<Alerta | undefined> {
  const resposta = await request.get(`${FROTAS}/alertas-manutencao`);
  expect(resposta.ok()).toBeTruthy();
  return ((await resposta.json()) as Alerta[]).find((a) => a.placa === placa);
}

test.describe('Alerta de manutenção preventiva (fluxo completo)', () => {
  const placa = placaAleatoria();
  let veiculoId: number;

  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    veiculoId = await criarVeiculoElegivel(request, placa);
    await request.dispose();
  });

  test.afterAll(async ({ playwright }) => {
    // Desativa o veículo de teste para ele não entrar em verificações futuras
    const request = await playwright.request.newContext();
    await request.patch(`${FROTAS}/veiculos/${veiculoId}/desativar`);
    await request.dispose();
  });

  test('veículo elegível gera alerta, e-mail é enviado e a tela lista o alerta por status', async ({
    page,
    request
  }) => {
    // 1) api-frotas verifica a elegibilidade e dispara o alerta para a api-notificacoes
    const verificacao = await request.post(`${FROTAS}/alertas-manutencao/verificacao`);
    expect(verificacao.ok()).toBeTruthy();

    let alerta = await alertaDe(request, placa);
    expect(alerta, 'alerta gerado para o veículo elegível').toBeDefined();
    expect(alerta?.motivo).toBe('QUILOMETRAGEM');

    // 2) se o envio simulado falhou, o alerta fica PENDENTE e o reprocessamento o envia
    for (let tentativa = 0; tentativa < 8 && alerta?.status === 'PENDENTE'; tentativa++) {
      await request.post(`${FROTAS}/alertas-manutencao/reprocessamento`);
      alerta = await alertaDe(request, placa);
    }
    expect(alerta?.status).toBe('ENVIADO');

    // 3) a api-notificacoes registrou exatamente um e-mail enviado ao gestor para esse alerta
    const emails = await request.get(
      `${NOTIFICACOES}/notificacoes?tipo=ALERTA_MANUTENCAO_PREVENTIVA&servicoOrigem=api-frotas`
    );
    const doAlerta = ((await emails.json()) as Array<Record<string, string>>).filter(
      (n) => n['referenciaId'] === `alerta-manutencao-${alerta?.id}`
    );
    expect(doAlerta).toHaveLength(1);
    expect(doAlerta[0]['status']).toBe('ENVIADO');
    expect(doAlerta[0]['canal']).toBe('email');
    expect(doAlerta[0]['destinatario']).toBe('gestor@rotalog.com');
    expect(doAlerta[0]['assunto']).toContain(placa);

    // 4) nova verificação não duplica o alerta nem o e-mail
    await request.post(`${FROTAS}/alertas-manutencao/verificacao`);
    const todos = (await (await request.get(`${FROTAS}/alertas-manutencao`)).json()) as Alerta[];
    expect(todos.filter((a) => a.placa === placa)).toHaveLength(1);

    // 5) painel: link no sidebar leva à tela de alertas
    await page.goto('/');
    await page.getByRole('link', { name: /Alertas de Manutenção/ }).click();
    await expect(page).toHaveURL(/\/alertas-manutencao$/);
    await expect(page.getByRole('heading', { name: 'Alertas de Manutenção' })).toBeVisible();

    // 6) sem filtro o alerta aparece; com status ENVIADO aparece; com PENDENTE e FALHA não aparece
    const linha = page.getByRole('row').filter({ hasText: placa });
    await expect(linha).toBeVisible();

    const filtro = page.locator('select');
    await filtro.selectOption('ENVIADO');
    await expect(linha).toBeVisible();
    await expect(linha.locator('.status-badge')).toHaveText('ENVIADO');
    await expect(linha).toContainText('Quilometragem');

    await filtro.selectOption('PENDENTE');
    await expect(linha).toHaveCount(0);

    await filtro.selectOption('FALHA');
    await expect(linha).toHaveCount(0);

    await filtro.selectOption('');
    await expect(linha).toBeVisible();
  });
});
