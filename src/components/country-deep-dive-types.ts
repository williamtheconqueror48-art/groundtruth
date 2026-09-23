// Data interfaces for the country deep-dive panel.
// Moved here in the GROUNDTRUTH strip (2026-09-23); formerly exported by the
// deleted AI-brief surface CountryBriefPanel.ts. These are plain data shapes
// (energy mix, port activity, military/economic summaries) — no AI.

import type { ChinaDecisionSignalGroupId } from '../../shared/china-decision-signals';
import type { DecisionSignalProvenance } from '../../shared/decision-signal-provenance-contract';

export interface StockIndexData {
  available: boolean;
  code: string;
  symbol: string;
  indexName: string;
  price: string;
  weekChangePercent: string;
  currency: string;
  cached?: boolean;
}

type ThreatLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
type TrendDirection = 'up' | 'down' | 'flat';

export interface CountryDeepDiveSignalItem {
  type: 'MILITARY' | 'PROTEST' | 'CYBER' | 'DISASTER' | 'OUTAGE' | 'OTHER';
  severity: ThreatLevel;
  description: string;
  timestamp: Date;
}

export interface CountryDeepDiveSignalDetails {
  critical: number;
  high: number;
  medium: number;
  low: number;
  recentHigh: CountryDeepDiveSignalItem[];
}

export interface CountryDeepDiveBaseSummary {
  id: string;
  name: string;
  distanceKm: number;
  country?: string;
}

export interface CountryDeepDiveMilitarySummary {
  ownFlights: number;
  foreignFlights: number;
  nearbyVessels: number;
  nearestBases: CountryDeepDiveBaseSummary[];
  foreignPresence: boolean;
}

export interface CountryDeepDiveEconomicIndicator {
  label: string;
  value: string;
  trend: TrendDirection;
  source?: string;
}

export type ChinaCountrySummaryGroupId = ChinaDecisionSignalGroupId;
export type ChinaCountrySummaryState = 'loading' | 'available' | 'partial' | 'stale' | 'unavailable';

export interface ChinaCountrySummarySignal {
  label: string;
  value: string;
  source: string;
  sourceUrl?: string;
  observedAt?: string;
  publishedAt?: string;
  effectiveAt?: string;
  action?: string;
  status?: string;
  sectors?: string[];
  entities?: string[];
  translationState?: string;
  publisherType?: string;
  lineageId?: string;
  provenance?: DecisionSignalProvenance;
  stale: boolean;
}

export interface ChinaCountrySummaryGroup {
  id: ChinaCountrySummaryGroupId;
  state: ChinaCountrySummaryState;
  signals: ChinaCountrySummarySignal[];
  unavailableReason?: string;
}

export interface ChinaCountrySummaryData {
  groups: ChinaCountrySummaryGroup[];
}

export interface CountryFactsData {
  headOfState: string;
  headOfStateTitle: string;
  wikipediaSummary: string;
  wikipediaThumbnailUrl: string;
  population: number;
  capital: string;
  languages: string[];
  currencies: string[];
  areaSqKm: number;
  countryName: string;
}

export interface CountryEnergyProfileData {
  mixAvailable: boolean;
  mixYear: number;
  coalShare: number;
  gasShare: number;
  oilShare: number;
  nuclearShare: number;
  renewShare: number;
  windShare: number;
  solarShare: number;
  hydroShare: number;
  importShare: number;
  importShareAvailable: boolean;
  importShareYear: number;
  importShareSource: string;
  gasStorageAvailable: boolean;
  gasStorageFillPct: number;
  gasStorageChange1d: number;
  gasStorageTrend: string;
  gasStorageDate: string;
  electricityAvailable: boolean;
  electricityPriceMwh: number;
  electricitySource: string;
  electricityDate: string;
  jodiOilAvailable: boolean;
  jodiOilDataMonth: string;
  gasolineDemandKbd: number;
  gasolineImportsKbd: number;
  dieselDemandKbd: number;
  dieselImportsKbd: number;
  jetDemandKbd: number;
  jetImportsKbd: number;
  lpgDemandKbd: number;
  lpgImportsKbd: number;
  crudeImportsKbd: number;
  jodiGasAvailable: boolean;
  jodiGasDataMonth: string;
  gasTotalDemandTj: number;
  gasLngImportsTj: number;
  gasPipeImportsTj: number;
  gasLngShare: number;
  ieaStocksAvailable: boolean;
  ieaStocksDataMonth: string;
  ieaDaysOfCover: number;
  ieaNetExporter: boolean;
  ieaBelowObligation: boolean;
  emberFossilShare: number;
  emberRenewShare: number;
  emberNuclearShare: number;
  emberCoalShare: number;
  emberGasShare: number;
  emberDemandTwh: number;
  emberDataMonth: string;
  emberAvailable: boolean;
  sprRegime: string;
  sprCapacityMb: number;
  sprOperator: string;
  sprIeaMember: boolean;
  sprStockholdingModel: string;
  sprNote: string;
  sprSource: string;
  sprAsOf: string;
  sprAvailable: boolean;
}

export interface CountryPortActivityData {
  available: boolean;
  ports: {
    portId: string;
    portName: string;
    lat: number;
    lon: number;
    tankerCalls30d: number;
    trendDeltaPct: number;
    importTankerDwt: number;
    exportTankerDwt: number;
    anomalySignal: boolean;
  }[];
  fetchedAt: string;
}

