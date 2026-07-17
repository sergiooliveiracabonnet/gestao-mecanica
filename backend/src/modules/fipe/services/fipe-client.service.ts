import { Injectable } from '@nestjs/common';
import type { FipeCategory } from '@oficina/contracts';

const FIPE_API_BASE_URL = 'https://fipe.parallelum.com.br/api/v2';

const CATEGORY_PATH_SEGMENT: Record<FipeCategory, string> = {
  CAR: 'cars',
  MOTORCYCLE: 'motorcycles',
  TRUCK: 'trucks',
};

export interface FipeApiBrand {
  code: string;
  name: string;
}

export interface FipeApiModel {
  code: string;
  name: string;
}

// Camada Service: só busca dado externo, nunca toca o banco (ver
// SERVICES_AND_BEANS.md). `fetch` nativo do Node — sem lib nova, ver
// Gotcha do plano sobre isso ser a primeira chamada HTTP externa do backend.
@Injectable()
export class FipeClientService {
  async fetchBrands(category: FipeCategory): Promise<FipeApiBrand[]> {
    // NODE_ENV=test: a fila `fipe-sync` é um recurso do Redis REAL
    // compartilhado entre TODOS os arquivos de teste e2e rodando em
    // paralelo (cada um sobe seu próprio AppModule/worker, mas todos
    // escutam a MESMA fila no mesmo Redis) — um job enfileirado por
    // fipe.e2e-spec.ts pode ser consumido pelo worker de QUALQUER outro
    // arquivo. Mockar o client só em fipe.e2e-spec.ts não protege os
    // outros arquivos; a guarda tem que estar aqui, na borda real com a
    // rede (achado ao vivo: service-orders.e2e-spec.ts travava no
    // afterAll processando uma sincronização real originada em outro
    // arquivo de teste).
    if (process.env.NODE_ENV === 'test') {
      return [];
    }
    const segment = CATEGORY_PATH_SEGMENT[category];
    const response = await fetch(`${FIPE_API_BASE_URL}/${segment}/brands`);
    if (!response.ok) {
      throw new Error(`FIPE API respondeu ${response.status} ao buscar marcas de ${category}`);
    }
    return (await response.json()) as FipeApiBrand[];
  }

  async fetchModels(category: FipeCategory, brandFipeCode: string): Promise<FipeApiModel[]> {
    if (process.env.NODE_ENV === 'test') {
      return [];
    }
    const segment = CATEGORY_PATH_SEGMENT[category];
    const response = await fetch(`${FIPE_API_BASE_URL}/${segment}/brands/${brandFipeCode}/models`);
    if (!response.ok) {
      throw new Error(`FIPE API respondeu ${response.status} ao buscar modelos da marca ${brandFipeCode} (${category})`);
    }
    return (await response.json()) as FipeApiModel[];
  }
}
