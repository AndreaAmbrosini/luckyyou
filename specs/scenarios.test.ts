import { loadFeature } from '@amiceli/vitest-cucumber';
import { describeSpec } from './support/spec';

describeSpec(await loadFeature('./scenarios.feature'));
