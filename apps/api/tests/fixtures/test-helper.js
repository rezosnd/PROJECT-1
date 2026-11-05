import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config/index.js';
import { pool } from '../../src/infra/db.js';
import { createApp } from '../../src/app.js';
import { setCustomGoogleVerifier, resetCustomGoogleVerifier } from '../../src/modules/auth/google-verifier.js';
import { encryptAbhaNumber, hashAbhaNumber } from '../../src/modules/abha/abha.crypto.js';

export const TEST_HOSPITAL_AIIMS_ID = '11111111-1111-4111-a111-111111111111';
export const TEST_HOSPITAL_KIMS_ID = '22222222-2222-4222-a222-222222222222';
export const TEST_CITY_ADMIN_ID = '33333333-3333-4333-a333-333333333333';
export const TEST_STAFF_ID = '44444444-4444-4444-a444-444444444444';
export const TEST_PATIENT_ID = '55555555-5555-4555-a555-555555555555';

export const TEST_EQUIPMENT_VENT_AIIMS = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
export const TEST_EQUIPMENT_CT_AIIMS = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

export const TEST_CONDITION_STROKE_ID = 'cccccccc-cccc-4ccc-accc-cccccccccccc';
export const TEST_CONDITION_PREEMIE_ID = 'dddddddd-dddd-4ddd-addd-dddddddddddd';

// In-memory relational database state for zero-dependency test execution
export const testState = {
  users: [],
  preregistered_staff: [],
  refresh_tokens: [],
  hospitals: [],
  bed_inventory: [],
  bed_ledger: [],
  bed_snapshots: [],
  bed_flow_hourly: [],
  expected_discharges: [],
  bed_requests: [],
  equipment: [],
  equipment_status_log: [],
  abha_links: [],
  abha_consents: [],
  conditions: [],
  condition_requirements: [],
  audit_log: [],
  idempotency_keys: []
};

export function resetTestDb() {
  testState.users = [
    {
      id: TEST_CITY_ADMIN_ID,
      google_sub: 'sub-city-admin-1',
      email: config.SEED_ADMIN_EMAIL.toLowerCase(),
      name: 'City Health Officer',
      picture_url: 'https://example.com/admin.jpg',
      role: 'CITY_ADMIN',
      hospital_id: null,
      status: 'ACTIVE',
      last_login_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: TEST_STAFF_ID,
      google_sub: 'sub-staff-aiims-1',
      email: 'staff.aiims@gmail.com',
      name: 'Dr. AIIMS Staff',
      picture_url: null,
      role: 'HOSPITAL_STAFF',
      hospital_id: TEST_HOSPITAL_AIIMS_ID,
      status: 'ACTIVE',
      last_login_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: TEST_PATIENT_ID,
      google_sub: 'sub-patient-1',
      email: 'patient.odisha@gmail.com',
      name: 'Citizen Patient',
      picture_url: null,
      role: 'PATIENT',
      hospital_id: null,
      status: 'ACTIVE',
      last_login_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  testState.hospitals = [
    {
      id: TEST_HOSPITAL_AIIMS_ID,
      name: 'AIIMS Bhubaneswar',
      type: 'GOVERNMENT',
      registration_no: 'OD-BBSR-2026-0001',
      address: 'Sijua, Patrapada, Bhubaneswar',
      city: 'Bhubaneswar',
      pin: '751019',
      phone: '+91-674-2476789',
      email: 'emergency@aiimsbhubaneswar.edu.in',
      emergency_24x7: true,
      trauma_level: 3,
      rating_avg: 4.80,
      status: 'VERIFIED',
      specialties: ['Cardiology', 'Neurology', 'Oncology'],
      facilities: ['Blood Bank', 'Trauma Centre', 'Helipad'],
      latitude: 20.2285,
      longitude: 85.7770,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: TEST_HOSPITAL_KIMS_ID,
      name: 'KIMS Hospital',
      type: 'PRIVATE',
      registration_no: 'OD-BBSR-2026-0002',
      address: 'KIIT Road, Patia, Bhubaneswar',
      city: 'Bhubaneswar',
      pin: '751024',
      phone: '+91-674-7105300',
      email: 'helpdesk@kims.ac.in',
      emergency_24x7: true,
      trauma_level: 3,
      rating_avg: 4.60,
      status: 'VERIFIED',
      specialties: ['Cardiology', 'Pediatrics'],
      facilities: ['Cath Lab', 'NICU'],
      latitude: 20.3533,
      longitude: 85.8197,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  testState.bed_inventory = [
    {
      id: 'bed-aiims-icu-1',
      hospital_id: TEST_HOSPITAL_AIIMS_ID,
      ward_type: 'ICU',
      total: 10,
      occupied: 7,
      reserved: 2,
      cleaning: 0,
      maintenance: 0,
      has_ventilator_beds: 10,
      version: 1,
      updated_at: new Date().toISOString()
    },
    {
      id: 'bed-aiims-gen-1',
      hospital_id: TEST_HOSPITAL_AIIMS_ID,
      ward_type: 'GENERAL',
      total: 50,
      occupied: 30,
      reserved: 0,
      cleaning: 5,
      maintenance: 0,
      has_ventilator_beds: 0,
      version: 1,
      updated_at: new Date().toISOString()
    },
    {
      id: 'bed-kims-icu-1',
      hospital_id: TEST_HOSPITAL_KIMS_ID,
      ward_type: 'ICU',
      total: 15,
      occupied: 10,
      reserved: 0,
      cleaning: 0,
      maintenance: 0,
      has_ventilator_beds: 15,
      version: 1,
      updated_at: new Date().toISOString()
    }
  ];

  testState.equipment = [
    {
      id: TEST_EQUIPMENT_VENT_AIIMS,
      hospital_id: TEST_HOSPITAL_AIIMS_ID,
      type: 'VENTILATOR',
      name: 'Servo-U Critical Care',
      model: 'Getinge-2024',
      serial_no: 'SN-VENT-01',
      status: 'AVAILABLE',
      criticality: 'CRITICAL',
      available_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: TEST_EQUIPMENT_CT_AIIMS,
      hospital_id: TEST_HOSPITAL_AIIMS_ID,
      type: 'CT',
      name: 'Somatom Force 128',
      model: 'Siemens SOMATOM',
      serial_no: 'SN-CT-01',
      status: 'AVAILABLE',
      criticality: 'HIGH',
      available_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  testState.abha_consents = [];
  testState.abha_links = [
    {
      user_id: TEST_PATIENT_ID,
      abha_number_enc: encryptAbhaNumber('14-1234-5678-9012'),
      abha_number_hash: hashAbhaNumber('14-1234-5678-9012'),
      abha_address: 'patient@abdm',
      status: 'LINKED',
      name: 'Citizen Patient',
      verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  testState.preregistered_staff = [
    {
      id: crypto.randomUUID(),
      email: 'future.nurse@gmail.com',
      role: 'HOSPITAL_STAFF',
      hospital_id: TEST_HOSPITAL_AIIMS_ID,
      created_at: new Date().toISOString()
    }
  ];

  testState.refresh_tokens = [];
  testState.audit_log = [];
  testState.idempotency_keys = [];
  testState.bed_ledger = [];
  testState.bed_snapshots = [];
  testState.bed_flow_hourly = [];
  testState.expected_discharges = [];
  testState.bed_requests = [];
  testState.equipment_status_log = [];

  testState.conditions = [
    {
      id: TEST_CONDITION_STROKE_ID,
      code: 'STROKE',
      name: 'Acute Ischemic / Hemorrhagic Stroke',
      aliases: ['Brain Stroke', 'Paralysis attack', 'CVA', 'Cerebrovascular Accident'],
      icd10: 'I63',
      category: 'Neurological',
      severity_default: 'CRITICAL',
      created_at: new Date().toISOString()
    },
    {
      id: TEST_CONDITION_PREEMIE_ID,
      code: 'PREMATURE_BABY',
      name: 'Premature Birth & Neonatal Respiratory Distress',
      aliases: ['Preemie', 'Preterm Infant', 'Neonatal Jaundice', 'RDS'],
      icd10: 'P07',
      category: 'Neonatal',
      severity_default: 'CRITICAL',
      created_at: new Date().toISOString()
    }
  ];

  testState.condition_requirements = [
    {
      id: 'req-stroke-1',
      condition_id: TEST_CONDITION_STROKE_ID,
      kind: 'BED',
      value: 'ICU',
      qty: 1,
      mandatory: true,
      preference_order: 1
    },
    {
      id: 'req-stroke-2',
      condition_id: TEST_CONDITION_STROKE_ID,
      kind: 'EQUIPMENT',
      value: 'CT',
      qty: 1,
      mandatory: true,
      preference_order: 1
    },
    {
      id: 'req-stroke-3',
      condition_id: TEST_CONDITION_STROKE_ID,
      kind: 'SPECIALTY',
      value: 'Neurology',
      qty: 1,
      mandatory: true,
      preference_order: 1
    },
    {
      id: 'req-preemie-1',
      condition_id: TEST_CONDITION_PREEMIE_ID,
      kind: 'BED',
      value: 'NICU',
      qty: 1,
      mandatory: true,
      preference_order: 1
    },
    {
      id: 'req-preemie-2',
      condition_id: TEST_CONDITION_PREEMIE_ID,
      kind: 'EQUIPMENT',
      value: 'INCUBATOR',
      qty: 1,
      mandatory: true,
      preference_order: 1
    },
    {
      id: 'req-preemie-3',
      condition_id: TEST_CONDITION_PREEMIE_ID,
      kind: 'SPECIALTY',
      value: 'Neonatology',
      qty: 1,
      mandatory: true,
      preference_order: 1
    }
  ];

  // Seed sample flow hourly data for AIIMS ICU
  const nowMs = Date.now();
  for (let h = 0; h < 72; h++) {
    testState.bed_flow_hourly.push({
      hospital_id: TEST_HOSPITAL_AIIMS_ID,
      ward_type: 'ICU',
      hour_start: new Date(nowMs - h * 3600 * 1000).toISOString(),
      admissions: (h % 3 === 0 ? 1 : 0),
      discharges: (h % 4 === 0 ? 1 : 0)
    });
  }
}

/**
 * Mock query router that evaluates queries against in-memory state during tests
 */
export function setupTestDbMock() {
  resetTestDb();

  pool.query = async (text, params = []) => {
    const q = text.replace(/\s+/g, ' ').trim();

    // 0. Transactions & Locks
    if (q === 'BEGIN' || q === 'COMMIT' || q === 'ROLLBACK') {
      return { rows: [], rowCount: 0 };
    }

    if (q.includes('pg_try_advisory_lock')) {
      return { rows: [{ acquired: true }], rowCount: 1 };
    }

    if (q.includes('pg_advisory_unlock')) {
      return { rows: [{ released: true }], rowCount: 1 };
    }

    // Health check
    if (q.includes('SELECT 1 as healthy') || q === 'SELECT 1;') {
      return { rows: [{ healthy: 1 }], rowCount: 1 };
    }

    // --- USERS ---
    if (q.startsWith('SELECT * FROM users WHERE google_sub = $1')) {
      const u = testState.users.find(x => x.google_sub === params[0]);
      return { rows: u ? [u] : [], rowCount: u ? 1 : 0 };
    }

    if (q.startsWith('SELECT * FROM users WHERE email = $1')) {
      const u = testState.users.find(x => x.email === params[0].toLowerCase());
      return { rows: u ? [u] : [], rowCount: u ? 1 : 0 };
    }

    if (q.includes('FROM users WHERE id = $1')) {
      const u = testState.users.find(x => x.id === params[0]);
      return { rows: u ? [u] : [], rowCount: u ? 1 : 0 };
    }

    if (q.includes('INSERT INTO users')) {
      const newUser = {
        id: crypto.randomUUID(),
        google_sub: params[0],
        email: params[1].toLowerCase(),
        name: params[2],
        picture_url: params[3],
        role: params[4],
        hospital_id: params[5],
        status: 'ACTIVE',
        last_login_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      testState.users.push(newUser);
      return { rows: [newUser], rowCount: 1 };
    }

    if (q.includes('UPDATE users') && q.includes('last_login_at = NOW()')) {
      const userId = params[0];
      const u = testState.users.find(x => x.id === userId);
      if (u) {
        if (params[1]) u.google_sub = params[1];
        if (params[2]) u.name = params[2];
        if (params[3]) u.picture_url = params[3];
        if (params[4]) u.role = params[4];
        if (params[5] !== undefined) u.hospital_id = params[5];
        u.last_login_at = new Date().toISOString();
        u.updated_at = new Date().toISOString();
      }
      return { rows: u ? [u] : [], rowCount: u ? 1 : 0 };
    }

    if (q.includes('UPDATE users') && q.includes('status = $2')) {
      const userId = params[0];
      const status = params[1];
      const u = testState.users.find(x => x.id === userId);
      if (u) {
        u.status = status;
        u.updated_at = new Date().toISOString();
      }
      return { rows: u ? [u] : [], rowCount: u ? 1 : 0 };
    }

    if (q.includes('UPDATE users') && q.includes('role = $2')) {
      const email = params[0].toLowerCase();
      const role = params[1];
      const hospitalId = params[2];
      const u = testState.users.find(x => x.email === email);
      if (u) {
        u.role = role;
        u.hospital_id = hospitalId;
        u.updated_at = new Date().toISOString();
      }
      return { rows: u ? [u] : [], rowCount: u ? 1 : 0 };
    }

    // List users count
    if (q.includes('SELECT COUNT(*) as total FROM users')) {
      return { rows: [{ total: testState.users.length }], rowCount: 1 };
    }

    // List users with left join
    if (q.includes('SELECT') && q.includes('FROM users u') && q.includes('LEFT JOIN hospitals h')) {
      const mapped = testState.users.map(u => {
        const h = testState.hospitals.find(x => x.id === u.hospital_id);
        return {
          ...u,
          hospital_name: h ? h.name : null
        };
      });
      return { rows: mapped, rowCount: mapped.length };
    }

    // --- PREREGISTERED STAFF ---
    if (q.startsWith('SELECT * FROM preregistered_staff WHERE email = $1')) {
      const record = testState.preregistered_staff.find(x => x.email === params[0].toLowerCase());
      return { rows: record ? [record] : [], rowCount: record ? 1 : 0 };
    }

    if (q.startsWith('DELETE FROM preregistered_staff WHERE id = $1')) {
      const idx = testState.preregistered_staff.findIndex(x => x.id === params[0]);
      if (idx !== -1) {
        const [deleted] = testState.preregistered_staff.splice(idx, 1);
        return { rows: [deleted], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (q.includes('INSERT INTO preregistered_staff')) {
      const email = params[0].toLowerCase();
      const role = params[1];
      const hospitalId = params[2];
      let existing = testState.preregistered_staff.find(x => x.email === email);
      if (existing) {
        existing.role = role;
        existing.hospital_id = hospitalId;
      } else {
        existing = {
          id: crypto.randomUUID(),
          email,
          role,
          hospital_id: hospitalId,
          created_at: new Date().toISOString()
        };
        testState.preregistered_staff.push(existing);
      }
      return { rows: [existing], rowCount: 1 };
    }

    // --- REFRESH TOKENS ---
    if (q.includes('INSERT INTO refresh_tokens')) {
      const record = {
        id: crypto.randomUUID(),
        user_id: params[0],
        token_hash: params[1],
        family_id: params[2],
        expires_at: params[3],
        revoked_at: null,
        created_at: new Date().toISOString()
      };
      testState.refresh_tokens.push(record);
      return { rows: [record], rowCount: 1 };
    }

    if (q.startsWith('SELECT * FROM refresh_tokens WHERE token_hash = $1')) {
      const record = testState.refresh_tokens.find(x => x.token_hash === params[0]);
      return { rows: record ? [record] : [], rowCount: record ? 1 : 0 };
    }

    if (q.includes('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1')) {
      const record = testState.refresh_tokens.find(x => x.id === params[0]);
      if (record) record.revoked_at = new Date().toISOString();
      return { rows: [], rowCount: record ? 1 : 0 };
    }

    if (q.includes('WHERE family_id = $1 AND revoked_at IS NULL')) {
      for (const t of testState.refresh_tokens) {
        if (t.family_id === params[0] && !t.revoked_at) {
          t.revoked_at = new Date().toISOString();
        }
      }
      return { rows: [], rowCount: 1 };
    }

    if (q.includes('refresh_tokens') && q.includes('WHERE user_id = $1 AND revoked_at IS NULL')) {
      for (const t of testState.refresh_tokens) {
        if (t.user_id === params[0] && !t.revoked_at) {
          t.revoked_at = new Date().toISOString();
        }
      }
      return { rows: [], rowCount: 1 };
    }

    // --- AUDIT LOG ---
    if (q.includes('INSERT INTO audit_log')) {
      let meta = null;
      const metaParam = params[5] || params[4];
      if (metaParam && typeof metaParam === 'string') {
        try { meta = JSON.parse(metaParam); } catch { meta = metaParam; }
      } else if (metaParam && typeof metaParam === 'object') {
        meta = metaParam;
      }
      testState.audit_log.push({
        id: crypto.randomUUID(),
        actor_id: params[0],
        action: params[1],
        resource_type: params[2],
        resource_id: params[3],
        ip: params[4],
        meta,
        at: new Date().toISOString()
      });
      return { rows: [], rowCount: 1 };
    }

    // --- IDEMPOTENCY KEYS ---
    if (q.startsWith('SELECT response FROM idempotency_keys WHERE key = $1')) {
      const record = testState.idempotency_keys.find(x => x.key === params[0]);
      return { rows: record ? [{ response: record.response }] : [], rowCount: record ? 1 : 0 };
    }

    if (q.includes('INSERT INTO idempotency_keys')) {
      testState.idempotency_keys.push({
        key: params[0],
        user_id: params[1],
        route: params[2],
        response: params[3]
      });
      return { rows: [], rowCount: 1 };
    }

    // --- BED INVENTORY & LEDGER ---
    if (q.includes('FROM bed_inventory') && q.includes('WHERE hospital_id = $1 AND ward_type = $2 FOR UPDATE')) {
      const ward = testState.bed_inventory.find(x => x.hospital_id === params[0] && x.ward_type === params[1]);
      if (!ward) return { rows: [], rowCount: 0 };
      const free = ward.total - ward.occupied - ward.reserved - ward.cleaning - ward.maintenance;
      return { rows: [{ ...ward, free }], rowCount: 1 };
    }

    if (q.includes('FROM bed_inventory') && q.includes('WHERE hospital_id = $1 ORDER BY ward_type ASC')) {
      const wards = testState.bed_inventory
        .filter(x => x.hospital_id === params[0])
        .map(w => ({
          ...w,
          free: w.total - w.occupied - w.reserved - w.cleaning - w.maintenance
        }))
        .sort((a, b) => a.ward_type.localeCompare(b.ward_type));
      return { rows: wards, rowCount: wards.length };
    }

    if (q.includes('UPDATE bed_inventory') && q.includes('SET total = $2')) {
      const ward = testState.bed_inventory.find(x => x.id === params[0]);
      if (ward) {
        ward.total = params[1];
        ward.occupied = params[2];
        ward.reserved = params[3];
        ward.cleaning = params[4];
        ward.maintenance = params[5];
        if (params[6] !== undefined && params[6] !== null) ward.has_ventilator_beds = params[6];
        ward.version = (ward.version || 1) + 1;
        ward.updated_at = new Date().toISOString();
        const free = ward.total - ward.occupied - ward.reserved - ward.cleaning - ward.maintenance;
        return { rows: [{ ...ward, free }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (q.includes('INSERT INTO bed_inventory')) {
      const existing = testState.bed_inventory.find(b => b.hospital_id === params[0] && b.ward_type === params[1]);
      if (!existing) {
        testState.bed_inventory.push({
          id: `bed-${crypto.randomUUID()}`,
          hospital_id: params[0],
          ward_type: params[1],
          total: params[2],
          occupied: params[3],
          reserved: params[4],
          cleaning: params[5],
          maintenance: params[6],
          has_ventilator_beds: params[7],
          version: 1,
          updated_at: new Date().toISOString()
        });
      }
      return { rows: [], rowCount: 1 };
    }

    if (q.includes('INSERT INTO bed_ledger')) {
      testState.bed_ledger.push({
        hospital_id: params[0],
        ward_type: params[1],
        field: params[2],
        delta: params[3],
        reason: params[4],
        actor_id: params[5],
        at: new Date().toISOString()
      });
      return { rows: [], rowCount: 1 };
    }

    if (q.includes('INSERT INTO bed_flow_hourly')) {
      testState.bed_flow_hourly.push({
        hospital_id: params[0],
        ward_type: params[1],
        deltaAdmissions: params[2],
        deltaDischarges: params[3],
        at: new Date().toISOString()
      });
      return { rows: [], rowCount: 1 };
    }

    if (q.includes('INSERT INTO bed_snapshots')) {
      testState.bed_snapshots.push({
        hospital_id: params[0],
        ward_type: params[1],
        total: params[2],
        occupied: params[3],
        reserved: params[4],
        free: params[5],
        at: new Date().toISOString()
      });
      return { rows: [], rowCount: 1 };
    }

    if (q.includes('INSERT INTO expected_discharges')) {
      testState.expected_discharges.push({
        hospital_id: params[0],
        ward_type: params[1],
        expected_at: params[2]
      });
      return { rows: [], rowCount: 1 };
    }

    // --- BED REQUESTS ---
    if (q.includes('INSERT INTO bed_requests')) {
      const newReq = {
        id: crypto.randomUUID(),
        patient_id: params[0],
        hospital_id: params[1],
        ward_type: params[2],
        urgency: params[3],
        condition_id: params[4] || null,
        note: params[5] || null,
        share_abha: params[6] || false,
        status: 'PENDING',
        hold_expires_at: params[7],
        idempotency_key: params[8],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        reason: null
      };
      testState.bed_requests.push(newReq);
      return { rows: [newReq], rowCount: 1 };
    }

    if (q.includes('FROM bed_requests') && q.includes('WHERE id = $1 FOR UPDATE')) {
      const req = testState.bed_requests.find(x => x.id === params[0]);
      return { rows: req ? [req] : [], rowCount: req ? 1 : 0 };
    }

    if (q.includes('FROM bed_requests br') && q.includes('WHERE br.id = $1')) {
      const req = testState.bed_requests.find(x => x.id === params[0]);
      if (req) {
        const h = testState.hospitals.find(x => x.id === req.hospital_id);
        return { rows: [{ ...req, hospital_name: h ? h.name : null }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (q.includes('FROM bed_requests br') && q.includes('WHERE br.patient_id = $1')) {
      const reqs = testState.bed_requests
        .filter(x => x.patient_id === params[0])
        .map(r => {
          const h = testState.hospitals.find(x => x.id === r.hospital_id);
          const remaining_seconds = Math.max(0, Math.round((new Date(r.hold_expires_at) - new Date()) / 1000));
          return {
            ...r,
            hospital_name: h ? h.name : null,
            remaining_seconds
          };
        });
      return { rows: reqs, rowCount: reqs.length };
    }

    if (q.includes('FROM bed_requests br') && q.includes('JOIN users u ON br.patient_id = u.id')) {
      let filtered = testState.bed_requests.filter(x => x.hospital_id === params[0]);
      if (params[1]) {
        filtered = filtered.filter(x => x.status === params[1]);
      }
      const mapped = filtered.map(r => {
        const u = testState.users.find(x => x.id === r.patient_id);
        const al = testState.abha_links.find(x => x.user_id === r.patient_id && x.status === 'LINKED');
        const remaining_seconds = Math.max(0, Math.round((new Date(r.hold_expires_at) - new Date()) / 1000));
        return {
          id: r.id,
          patient_id: r.patient_id,
          patient_name: u ? u.name : 'Unknown',
          patient_email: u ? u.email : 'Unknown',
          ward_type: r.ward_type,
          urgency: r.urgency,
          condition_id: r.condition_id,
          note: r.note,
          share_abha: r.share_abha,
          status: r.status,
          hold_expires_at: r.hold_expires_at,
          created_at: r.created_at,
          remaining_seconds,
          abha: r.share_abha && al ? {
            maskedNumber: `**-****-****-${al.abha_address.slice(-4)}`,
            abhaAddress: al.abha_address,
            verifiedName: al.name
          } : null
        };
      });
      return { rows: mapped, rowCount: mapped.length };
    }

    if (q.includes('UPDATE bed_requests') && q.includes('SET status = $2')) {
      const req = testState.bed_requests.find(x => x.id === params[0]);
      if (req) {
        req.status = params[1];
        if (params[2]) req.decided_by = params[2];
        if (params[3]) req.reason = params[3];
        req.updated_at = new Date().toISOString();
        return { rows: [req], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (q.includes('FROM bed_requests') && q.includes('WHERE status = \'PENDING\' AND hold_expires_at < NOW()')) {
      const now = new Date();
      const expired = testState.bed_requests.filter(x => x.status === 'PENDING' && new Date(x.hold_expires_at) < now);
      return { rows: expired, rowCount: expired.length };
    }

    // --- CITY SUMMARY ---
    if (q.includes('FROM bed_inventory bi') && q.includes('JOIN hospitals h ON bi.hospital_id = h.id')) {
      const rows = [];
      for (const h of testState.hospitals.filter(x => x.status === 'VERIFIED')) {
        for (const bi of testState.bed_inventory.filter(x => x.hospital_id === h.id)) {
          rows.push({
            hospital_id: h.id,
            hospital_name: h.name,
            type: h.type,
            trauma_level: h.trauma_level,
            ward_type: bi.ward_type,
            total: bi.total,
            occupied: bi.occupied,
            reserved: bi.reserved,
            cleaning: bi.cleaning,
            maintenance: bi.maintenance,
            has_ventilator_beds: bi.has_ventilator_beds,
            free: bi.total - bi.occupied - bi.reserved - bi.cleaning - bi.maintenance
          });
        }
      }
      return { rows, rowCount: rows.length };
    }

    // --- EQUIPMENT ---
    if (q.includes('FROM equipment') && q.includes('WHERE hospital_id = $1') && q.includes('GROUP BY type, status')) {
      const counts = {};
      for (const eq of testState.equipment.filter(x => x.hospital_id === params[0])) {
        const key = `${eq.type}|${eq.status}`;
        counts[key] = (counts[key] || 0) + 1;
      }
      const rows = Object.entries(counts).map(([k, count]) => {
        const [type, status] = k.split('|');
        return { type, status, count };
      });
      return { rows, rowCount: rows.length };
    }

    if (q.includes('FROM equipment') && q.includes('WHERE') && q.includes('hospital_id = $1')) {
      let filtered = testState.equipment.filter(x => x.hospital_id === params[0]);
      if (params[1]) {
        filtered = filtered.filter(x => x.type === params[1] || x.status === params[1]);
      }
      return { rows: filtered, rowCount: filtered.length };
    }

    if (q.includes('FROM equipment e') && q.includes('WHERE e.id = $1')) {
      const eq = testState.equipment.find(x => x.id === params[0]);
      if (eq) {
        const h = testState.hospitals.find(x => x.id === eq.hospital_id);
        return {
          rows: [{
            ...eq,
            hospital_name: h ? h.name : null,
            hospital_address: h ? h.address : null,
            hospital_phone: h ? h.phone : null,
            hospital_lat: 20.2285,
            hospital_lng: 85.7770
          }],
          rowCount: 1
        };
      }
      return { rows: [], rowCount: 0 };
    }

    if (q.includes('FROM equipment') && q.includes('WHERE id = $1 FOR UPDATE')) {
      const eq = testState.equipment.find(x => x.id === params[0]);
      return { rows: eq ? [{ ...eq }] : [], rowCount: eq ? 1 : 0 };
    }

    if (q.includes('INSERT INTO equipment (')) {
      const newEq = {
        id: crypto.randomUUID(),
        hospital_id: params[0],
        type: params[1],
        name: params[2],
        model: params[3] || null,
        serial_no: params[4],
        status: params[5] || 'AVAILABLE',
        criticality: params[6] || 'NORMAL',
        available_at: params[7] || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      testState.equipment.push(newEq);
      return { rows: [newEq], rowCount: 1 };
    }

    if (q.includes('UPDATE equipment') && q.includes('SET status = $2')) {
      const eq = testState.equipment.find(x => x.id === params[0]);
      if (eq) {
        eq.status = params[1];
        eq.available_at = params[2] !== undefined ? params[2] : null;
        eq.updated_at = new Date().toISOString();
        return { rows: [eq], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (q.includes('INSERT INTO equipment_status_log')) {
      testState.equipment_status_log.push({
        equipment_id: params[0],
        old_status: params[1],
        new_status: params[2],
        actor_id: params[3],
        at: new Date().toISOString()
      });
      return { rows: [], rowCount: 1 };
    }

    if (q.includes('FROM equipment e') && q.includes('JOIN hospitals h ON e.hospital_id = h.id')) {
      let items = testState.equipment.map(eq => {
        const h = testState.hospitals.find(x => x.id === eq.hospital_id);
        return {
          ...eq,
          hospital_name: h ? h.name : null,
          hospital_address: h ? h.address : null,
          hospital_phone: h ? h.phone : null,
          hospital_lat: 20.2285,
          hospital_lng: 85.7770,
          distance_meters: 1850
        };
      });
      return { rows: items, rowCount: items.length };
    }

    // --- HOSPITALS ---
    if (q.includes('SELECT id, name FROM hospitals WHERE id = $1')) {
      const h = testState.hospitals.find(x => x.id === params[0]);
      return { rows: h ? [h] : [], rowCount: h ? 1 : 0 };
    }

    if (q.includes('FROM hospitals WHERE id = $1')) {
      const h = testState.hospitals.find(x => x.id === params[0]);
      return { rows: h ? [h] : [], rowCount: h ? 1 : 0 };
    }

    if (q.includes('SELECT COUNT(*) as total FROM hospitals')) {
      return { rows: [{ total: testState.hospitals.length }], rowCount: 1 };
    }

    // --- MATCHING (PostGIS Spatial Discovery) ---
    if (q.includes('ST_DWithin(h.location')) {
      const lat = params[0];
      const lng = params[1];
      const radiusMeters = params[2];

      const verifiedHospitals = testState.hospitals.filter(h => h.status === 'VERIFIED');
      const results = verifiedHospitals.map(h => {
        // Calculate beds for this hospital
        const beds = testState.bed_inventory
          .filter(b => b.hospital_id === h.id)
          .map(b => ({
            wardType: b.ward_type,
            total: b.total,
            occupied: b.occupied,
            reserved: b.reserved,
            cleaning: b.cleaning,
            maintenance: b.maintenance,
            hasVentilatorBeds: b.has_ventilator_beds,
            free: Math.max(0, b.total - (b.occupied + b.reserved + b.cleaning + b.maintenance))
          }));

        // Calculate equipment for this hospital
        const equipment = testState.equipment
          .filter(e => e.hospital_id === h.id)
          .map(e => ({
            id: e.id,
            type: e.type,
            name: e.name,
            status: e.status,
            criticality: e.criticality,
            availableAt: e.available_at
          }));

        return {
          id: h.id,
          name: h.name,
          type: h.type,
          address: h.address,
          city: h.city,
          pin: h.pin,
          phone: h.phone,
          email: h.email,
          emergency_24x7: h.emergency_24x7,
          trauma_level: h.trauma_level,
          rating_avg: h.rating_avg,
          specialties: h.specialties || [],
          facilities: h.facilities || [],
          latitude: h.latitude || 20.2285,
          longitude: h.longitude || 85.7770,
          distance_meters: h.id === TEST_HOSPITAL_AIIMS_ID ? 3200 : 7500,
          beds,
          equipment
        };
      });

      return { rows: results, rowCount: results.length };
    }

    if (q.includes('FROM hospitals') && q.includes('ORDER BY')) {
      const list = testState.hospitals.map(h => ({
        ...h,
        latitude: h.latitude || 20.2285,
        longitude: h.longitude || 85.7770,
        distance_meters: 2100
      }));
      return { rows: list, rowCount: list.length };
    }

    if (q.includes('INSERT INTO hospitals')) {
      const newH = {
        id: crypto.randomUUID(),
        name: params[0],
        type: params[1],
        registration_no: params[2],
        address: params[3],
        city: params[4],
        pin: params[5],
        longitude: params[6],
        latitude: params[7],
        phone: params[8],
        email: params[9],
        emergency_24x7: params[10],
        trauma_level: params[11],
        specialties: params[12] || [],
        facilities: params[13] || [],
        status: 'VERIFIED',
        rating_avg: 4.5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      testState.hospitals.push(newH);
      return { rows: [newH], rowCount: 1 };
    }

    if (q.includes('UPDATE hospitals') && q.includes('SET status = $2')) {
      const h = testState.hospitals.find(x => x.id === params[0]);
      if (h) {
        h.status = params[1];
        h.updated_at = new Date().toISOString();
        return { rows: [h], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (q.includes('UPDATE hospitals SET') && q.includes('WHERE id = $1')) {
      const h = testState.hospitals.find(x => x.id === params[0]);
      return { rows: h ? [h] : [], rowCount: h ? 1 : 0 };
    }

    // --- CONDITIONS ---
    if (q.includes('FROM conditions c') && q.includes('LEFT JOIN condition_requirements cr')) {
      if (q.includes('c.id = $1') || q.includes('UPPER(c.code) = UPPER($1)')) {
        const idOrCode = params[0];
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrCode);
        const cond = testState.conditions.find(c => isUuid ? c.id === idOrCode : c.code.toUpperCase() === idOrCode.toUpperCase());
        if (!cond) return { rows: [], rowCount: 0 };

        const reqs = testState.condition_requirements
          .filter(r => r.condition_id === cond.id)
          .map(r => ({
            id: r.id,
            kind: r.kind,
            value: r.value,
            qty: r.qty,
            mandatory: r.mandatory,
            preferenceOrder: r.preference_order
          }));

        return { rows: [{ ...cond, requirements: reqs }], rowCount: 1 };
      }

      // Search / list conditions
      let list = [...testState.conditions];
      if (params.length > 0 && typeof params[0] === 'string' && params[0].startsWith('%')) {
        const queryTerm = params[0].replace(/%/g, '').toLowerCase();
        list = list.filter(c => 
          c.name.toLowerCase().includes(queryTerm) ||
          c.code.toLowerCase().includes(queryTerm) ||
          (c.aliases && c.aliases.some(a => a.toLowerCase().includes(queryTerm)))
        );
      }

      const rows = list.map(c => {
        const reqs = testState.condition_requirements
          .filter(r => r.condition_id === c.id)
          .map(r => ({
            id: r.id,
            kind: r.kind,
            value: r.value,
            qty: r.qty,
            mandatory: r.mandatory,
            preferenceOrder: r.preference_order
          }));
        return { ...c, requirements: reqs };
      });

      return { rows, rowCount: rows.length };
    }

    if (q.includes('INSERT INTO conditions')) {
      const newC = {
        id: crypto.randomUUID(),
        code: params[0].toUpperCase(),
        name: params[1],
        aliases: params[2] || [],
        icd10: params[3] || null,
        category: params[4],
        severity_default: params[5],
        created_at: new Date().toISOString()
      };
      testState.conditions.push(newC);
      return { rows: [newC], rowCount: 1 };
    }

    if (q.includes('UPDATE conditions SET') && q.includes('WHERE id =')) {
      const condId = params[params.length - 1];
      const cond = testState.conditions.find(c => c.id === condId);
      if (cond) {
        if (params[0]) cond.name = params[0];
        return { rows: [cond], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (q.includes('DELETE FROM conditions WHERE id = $1')) {
      const idx = testState.conditions.findIndex(c => c.id === params[0]);
      if (idx !== -1) {
        const [deleted] = testState.conditions.splice(idx, 1);
        testState.condition_requirements = testState.condition_requirements.filter(r => r.condition_id !== deleted.id);
        return { rows: [deleted], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (q.includes('DELETE FROM condition_requirements WHERE condition_id = $1')) {
      testState.condition_requirements = testState.condition_requirements.filter(r => r.condition_id !== params[0]);
      return { rows: [], rowCount: 1 };
    }

    if (q.includes('INSERT INTO condition_requirements')) {
      const newReq = {
        id: crypto.randomUUID(),
        condition_id: params[0],
        kind: params[1],
        value: params[2],
        qty: params[3] || 1,
        mandatory: params[4] !== undefined ? params[4] : true,
        preference_order: params[5] || 1
      };
      testState.condition_requirements.push(newReq);
      return {
        rows: [{
          id: newReq.id,
          kind: newReq.kind,
          value: newReq.value,
          qty: newReq.qty,
          mandatory: newReq.mandatory,
          preferenceOrder: newReq.preference_order
        }],
        rowCount: 1
      };
    }

    // --- FORECASTING ---
    if (q.includes('FROM bed_flow_hourly')) {
      const hospId = params[0];
      const ward = params[1];
      const rows = testState.bed_flow_hourly.filter(f => f.hospital_id === hospId && f.ward_type === ward);
      return { rows, rowCount: rows.length };
    }

    if (q.includes('FROM expected_discharges')) {
      const hospId = params[0];
      const ward = params[1];
      const rows = testState.expected_discharges.filter(e => e.hospital_id === hospId && e.ward_type === ward);
      return { rows: [{ count: rows.length }], rowCount: 1 };
    }

    if (q.includes('FROM bed_inventory') && q.includes('WHERE hospital_id = $1 AND ward_type = $2')) {
      const ward = testState.bed_inventory.find(b => b.hospital_id === params[0] && b.ward_type === params[1]);
      if (ward) {
        const free = Math.max(0, ward.total - (ward.occupied + ward.reserved + ward.cleaning + ward.maintenance));
        return { rows: [{ ...ward, free }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (q.includes('SELECT bi.hospital_id, bi.ward_type, bi.total, bi.occupied, bi.reserved') && q.includes('FROM bed_inventory bi')) {
      const rows = testState.bed_inventory.map(b => ({
        hospital_id: b.hospital_id,
        ward_type: b.ward_type,
        total: b.total,
        occupied: b.occupied,
        reserved: b.reserved,
        free: Math.max(0, b.total - (b.occupied + b.reserved + b.cleaning + b.maintenance))
      }));
      return { rows, rowCount: rows.length };
    }

    if (q.includes('INSERT INTO bed_snapshots')) {
      testState.bed_snapshots.push({
        hospital_id: params[0],
        ward_type: params[1],
        total: params[2],
        occupied: params[3],
        reserved: params[4],
        free: params[5],
        at: new Date().toISOString()
      });
      return { rows: [], rowCount: 1 };
    }

    if (q.includes('WITH transitions AS') && q.includes('FROM equipment_status_log')) {
      return { rows: [{ avg_duration_minutes: 60 }], rowCount: 1 };
    }

    // --- ABHA & ABDM CONSENTS ---
    if (q.includes('INSERT INTO abha_consents')) {
      const newConsent = {
        id: crypto.randomUUID(),
        user_id: params[0],
        purpose: params[1],
        granted_at: new Date().toISOString(),
        revoked_at: null,
        created_at: new Date().toISOString()
      };
      testState.abha_consents.push(newConsent);
      return { rows: [newConsent], rowCount: 1 };
    }

    if (q.includes('FROM abha_consents') && q.includes('revoked_at IS NULL')) {
      const active = testState.abha_consents
        .filter(c => c.user_id === params[0] && !c.revoked_at)
        .sort((a, b) => new Date(b.granted_at) - new Date(a.granted_at));
      return { rows: active.slice(0, 1), rowCount: active.length > 0 ? 1 : 0 };
    }

    if (q.includes('UPDATE abha_consents') && q.includes('SET revoked_at = NOW()')) {
      const revoked = [];
      for (const c of testState.abha_consents) {
        if (c.user_id === params[0] && !c.revoked_at) {
          c.revoked_at = new Date().toISOString();
          revoked.push(c);
        }
      }
      return { rows: revoked, rowCount: revoked.length };
    }

    // --- ABHA LINKS ---
    if (q.includes('DELETE FROM abha_links')) {
      const idx = testState.abha_links.findIndex(l => l.user_id === params[0]);
      if (idx >= 0) {
        const [removed] = testState.abha_links.splice(idx, 1);
        return { rows: [removed], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (q.includes('SELECT') && q.includes('FROM abha_links') && q.includes('WHERE user_id = $1')) {
      const link = testState.abha_links.find(l => l.user_id === params[0]);
      return { rows: link ? [link] : [], rowCount: link ? 1 : 0 };
    }

    if (q.includes('SELECT') && q.includes('FROM abha_links') && q.includes('WHERE abha_number_hash = $1')) {
      const link = testState.abha_links.find(l => l.abha_number_hash === params[0]);
      return { rows: link ? [link] : [], rowCount: link ? 1 : 0 };
    }

    if (q.includes('INSERT INTO abha_links')) {
      const existingIdx = testState.abha_links.findIndex(l => l.user_id === params[0]);
      const linkObj = {
        user_id: params[0],
        abha_number_enc: params[1],
        abha_number_hash: params[2],
        abha_address: params[3],
        name: params[4],
        verified_at: new Date().toISOString(),
        status: 'LINKED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      if (existingIdx >= 0) {
        testState.abha_links[existingIdx] = linkObj;
      } else {
        testState.abha_links.push(linkObj);
      }
      return { rows: [linkObj], rowCount: 1 };
    }

    // Default empty result for unmocked queries
    return { rows: [], rowCount: 0 };
  };

  // Mock pool.connect() for transactions
  pool.connect = async () => {
    return {
      query: pool.query,
      release: () => {}
    };
  };
}

export function createTestAccessToken({
  sub = TEST_PATIENT_ID,
  role = 'PATIENT',
  hospitalId = null
} = {}) {
  const payload = {
    sub,
    role,
    hospitalId,
    jti: crypto.randomUUID()
  };
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}
