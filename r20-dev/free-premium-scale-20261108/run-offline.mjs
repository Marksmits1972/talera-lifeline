// Offline generator of one deterministic capacity *scenario*, not real traffic.
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {TARGETS,freeScenario,premiumScenario,premiumSynchronizedOpeningPeak} from './scale-model.mjs';
const data={
  document:'TALERA — FREE 10M / PREMIUM 1M separate scale gates',
  kind:'offline mathematical envelope, not real capacity measurement',
  source:'user-approved targets 2026-11-08; adjustable unmeasured traffic hypotheses',
  fixedTargets:TARGETS,
  scenarios:{
    freeOneHourRollout:freeScenario(),
    freeSixtySecondBurst:freeScenario({arrivalWindowSeconds:60}),
    premiumConcurrentSteady:premiumScenario(),
    premiumSynchronizedTenSecondPeak:premiumSynchronizedOpeningPeak()
  },
  evidence:{
    freeMillionScaleHttpBenchmark:false,
    premiumMillionConcurrentRealUsers:false,
    actualD1R2TrafficMeasurements:false,
    realWorldErrorRates:false,
    measuredMobilePerformance:false
  },
  finalVerdict:{free:'NIET BEWEZEN',premium:'NIET BEWEZEN'},
  note:'1M hypothetical session contexts in the formulas, NOT 1M running clients or open sockets. No real D1, R2 or user records are queried or changed.'
};
const file=fileURLToPath(new URL('./results-offline.json',import.meta.url));
writeFileSync(file,JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify(data,null,2));
