import type { ComponentType } from 'react';
import type { WidgetId } from '../types';
import PtSlider from './PtSlider';
import Tco2e from './Tco2e';
import ServiceValve from './ServiceValve';
import Pressostat from './Pressostat';
import R290Limit from './R290Limit';
import LogPh from './LogPh';

export const WIDGETS: Record<WidgetId, ComponentType> = {
  'pt-slider': PtSlider,
  tco2e: Tco2e,
  'service-valve': ServiceValve,
  pressostat: Pressostat,
  'r290-limit': R290Limit,
  logph: LogPh,
};
