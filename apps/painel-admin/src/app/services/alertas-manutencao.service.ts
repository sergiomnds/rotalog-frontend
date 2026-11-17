import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AlertaManutencao, StatusAlerta } from '../models';

// TODO: URL hardcoded - deveria usar environment (mesmo padrão do FrotasService)
const API_URL = 'http://localhost:8080';

@Injectable({
  providedIn: 'root'
})
export class AlertasManutencaoService {
  constructor(private http: HttpClient) {}

  /** Lista os alertas da api-frotas; com `status`, apenas os dessa situação (?status=). */
  listar(status?: StatusAlerta): Observable<AlertaManutencao[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http.get<AlertaManutencao[]>(`${API_URL}/api/alertas-manutencao`, { params });
  }
}
