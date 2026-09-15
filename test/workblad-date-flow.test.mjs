import assert from 'node:assert/strict';
import test from 'node:test';
import { WORKBLAD_DATE_FLOW_SCRIPT, WORKBLAD_DATE_FLOW_STYLE } from '../xxory-test/src/workblad-date-flow.js';
import { isFutureExactDate } from '../xxory-test/src/workblad-date-policy.js';

test('exact date is a direct native date control with today as maximum', () => {
  assert.match(WORKBLAD_DATE_FLOW_SCRIPT, /type=\"date\" max=\"'\+todayIso\(\)\+'\"/);
  assert.match(WORKBLAD_DATE_FLOW_SCRIPT, /Exacte datum/);
  assert.doesNotMatch(WORKBLAD_DATE_FLOW_SCRIPT, /currentYear\(\)\+2/);
});

test('the date field is owned by the simplified flow instead of the legacy lower-field picker', () => {
  assert.match(WORKBLAD_DATE_FLOW_SCRIPT, /closest\('#workDate'\)/);
  assert.match(WORKBLAD_DATE_FLOW_SCRIPT, /stopImmediatePropagation/);
  assert.match(WORKBLAD_DATE_FLOW_SCRIPT, /__taleraWorkbladV9SetDate/);
  assert.match(WORKBLAD_DATE_FLOW_STYLE, /work-title/);
  assert.match(WORKBLAD_DATE_FLOW_STYLE, /work-date-row/);
});

test('future exact dates are rejected by server-side policy as a safety net', () => {
  const future = new Date();
  future.setUTCDate(future.getUTCDate() + 2);
  const iso = future.toISOString().slice(0,10);
  assert.equal(isFutureExactDate(iso), true);
  assert.equal(isFutureExactDate('1 januari 2000'), false);
});
