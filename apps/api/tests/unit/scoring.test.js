import {
  scoreHospitalCandidate,
  evaluateProximity,
  evaluateBeds,
  evaluateEquipment,
  DEFAULT_WEIGHTS,
  HIGH_SEVERITY_WEIGHTS
} from '../../src/modules/matching/scoring/index.js';

describe('Scoring Engine (Pure Functions with Zero I/O)', () => {
  describe('evaluateProximity', () => {
    it('calculates correct ETA and proximity score for 5km', () => {
      const res = evaluateProximity(5000); // 5000 meters = 5 km
      expect(res.distanceKm).toBe(5.0);
      expect(res.etaMinutes).toBe(10); // 5km * 2 min/km = 10 min
      expect(res.score).toBeCloseTo(0.6667, 3);
      expect(res.score).toBeLessThanOrEqual(1.0);
    });

    it('returns score of 0 when distance is very far (>45 min ETA)', () => {
      const res = evaluateProximity(30000); // 30 km -> 60 min ETA
      expect(res.score).toBe(0);
    });
  });

  describe('evaluateBeds', () => {
    const mockInventory = [
      { ward_type: 'ICU', total: 10, occupied: 10, reserved: 0, cleaning: 0, maintenance: 0 }, // 0 free
      { ward_type: 'HDU', total: 15, occupied: 10, reserved: 2, cleaning: 1, maintenance: 0 }  // 2 free
    ];

    it('falls back to 2nd preference HDU when 1st preference ICU is completely full', () => {
      const requirements = [
        { kind: 'BED', value: 'ICU', mandatory: true, preference_order: 1 },
        { kind: 'BED', value: 'HDU', mandatory: false, preference_order: 2 }
      ];

      const res = evaluateBeds(mockInventory, requirements, 1);
      expect(res.passed).toBe(true);
      expect(res.selectedWard).toBe('HDU');
      expect(res.freeCount).toBe(2);
      expect(res.preferenceRank).toBe(2);
      // 2nd preference penalty (0.75 multiplier)
      expect(res.score).toBe(0.75);
    });

    it('fails bed filter when all acceptable ward types have 0 free beds', () => {
      const fullInventory = [
        { ward_type: 'ICU', total: 10, occupied: 10, reserved: 0, cleaning: 0, maintenance: 0 },
        { ward_type: 'HDU', total: 10, occupied: 10, reserved: 0, cleaning: 0, maintenance: 0 }
      ];
      const requirements = [
        { kind: 'BED', value: 'ICU', mandatory: true, preference_order: 1 },
        { kind: 'BED', value: 'HDU', mandatory: false, preference_order: 2 }
      ];

      const res = evaluateBeds(fullInventory, requirements, 1);
      expect(res.passed).toBe(false);
      expect(res.freeCount).toBe(0);
      expect(res.score).toBe(0);
    });
  });

  describe('evaluateEquipment', () => {
    it('fails mandatory equipment check if working units are 0', () => {
      const equipment = [
        { type: 'CT', status: 'FAULTY', criticality: 'HIGH' }
      ];
      const requirements = [
        { kind: 'EQUIPMENT', value: 'CT', qty: 1, mandatory: true }
      ];

      const res = evaluateEquipment(equipment, requirements);
      expect(res.passedMandatory).toBe(false);
      expect(res.missingMandatory.length).toBe(1);
      expect(res.missingMandatory[0]).toContain('Mandatory equipment unavailable: CT');
    });

    it('passes if mandatory equipment is available', () => {
      const equipment = [
        { type: 'CT', status: 'AVAILABLE', criticality: 'HIGH' }
      ];
      const requirements = [
        { kind: 'EQUIPMENT', value: 'CT', qty: 1, mandatory: true }
      ];

      const res = evaluateEquipment(equipment, requirements);
      expect(res.passedMandatory).toBe(true);
      expect(res.score).toBe(1.0);
    });
  });

  describe('scoreHospitalCandidate (Integrated Composite Scoring)', () => {
    const candidateHospital = {
      id: 'hosp-1',
      name: 'Sample Super Specialty',
      rating_avg: 4.8,
      trauma_level: 3,
      specialties: ['Neurology', 'Cardiology'],
      facilities: ['Blood Bank', 'Trauma Centre'],
      beds: [
        { ward_type: 'ICU', total: 10, occupied: 7, reserved: 0, cleaning: 0, maintenance: 0 } // 3 free
      ],
      equipment: [
        { type: 'CT', status: 'AVAILABLE' }
      ]
    };

    const strokeRequirements = [
      { kind: 'BED', value: 'ICU', mandatory: true, preference_order: 1 },
      { kind: 'EQUIPMENT', value: 'CT', qty: 1, mandatory: true },
      { kind: 'SPECIALTY', value: 'Neurology', mandatory: true }
    ];

    it('computes eligible composite match with explanation and breakdown', () => {
      const res = scoreHospitalCandidate(candidateHospital, strokeRequirements, {
        distanceMeters: 4000,
        severity: 'CRITICAL'
      });

      expect(res.eligible).toBe(true);
      expect(res.totalScore).toBeGreaterThan(0.7);
      expect(res.selectedWard).toBe('ICU');
      expect(res.freeCount).toBe(3);
      expect(res.breakdown).toBeDefined();
      expect(res.explanation).toContain('km away');
      expect(res.explanation).toContain('3 ICU beds free now');
      // High severity uses higher proximity and bed weights (0.35 each)
      expect(res.breakdown.weightsUsed).toEqual(HIGH_SEVERITY_WEIGHTS);
    });

    it('excludes hospital when mandatory equipment is completely offline', () => {
      const hospWithoutCT = {
        ...candidateHospital,
        equipment: [{ type: 'CT', status: 'OFFLINE' }]
      };

      const res = scoreHospitalCandidate(hospWithoutCT, strokeRequirements, {
        distanceMeters: 4000
      });

      expect(res.eligible).toBe(false);
      expect(res.reasons.length).toBeGreaterThan(0);
      expect(res.reasons[0]).toContain('Mandatory equipment unavailable: CT');
    });

    it('excludes hospital when mandatory clinical specialty is missing', () => {
      const hospWithoutNeuro = {
        ...candidateHospital,
        specialties: ['Orthopedics', 'Pediatrics']
      };

      const res = scoreHospitalCandidate(hospWithoutNeuro, strokeRequirements, {
        distanceMeters: 4000
      });

      expect(res.eligible).toBe(false);
      expect(res.reasons.length).toBeGreaterThan(0);
      expect(res.reasons[0]).toContain('Missing mandatory specialty: Neurology');
    });

    it('dialysis query matches only hospital with operational dialysis unit and free HDU/ICU bed', () => {
      const renalFailureRequirements = [
        { kind: 'BED', value: 'HDU', mandatory: true, preference_order: 1 },
        { kind: 'BED', value: 'ICU', mandatory: false, preference_order: 2 },
        { kind: 'EQUIPMENT', value: 'DIALYSIS', qty: 1, mandatory: true }
      ];

      const hospWithoutDialysis = {
        id: 'hosp-2',
        name: 'General Clinic',
        specialties: ['General Medicine'],
        facilities: [],
        beds: [{ ward_type: 'HDU', total: 10, occupied: 5, free: 5 }],
        equipment: [{ type: 'X_RAY', status: 'AVAILABLE' }]
      };

      const hospWithDialysis = {
        id: 'hosp-3',
        name: 'Nephrology Specialty Hospital',
        specialties: ['Nephrology', 'Critical Care'],
        facilities: ['Dialysis Unit'],
        beds: [{ ward_type: 'HDU', total: 10, occupied: 5, free: 5 }],
        equipment: [{ type: 'DIALYSIS', status: 'AVAILABLE' }]
      };

      const resFail = scoreHospitalCandidate(hospWithoutDialysis, renalFailureRequirements, { distanceMeters: 3000 });
      expect(resFail.eligible).toBe(false);
      expect(resFail.reasons[0]).toContain('Mandatory equipment unavailable: DIALYSIS');

      const resPass = scoreHospitalCandidate(hospWithDialysis, renalFailureRequirements, { distanceMeters: 3000 });
      expect(resPass.eligible).toBe(true);
      expect(resPass.selectedWard).toBe('HDU');
      expect(resPass.freeCount).toBe(5);
    });
  });
});

