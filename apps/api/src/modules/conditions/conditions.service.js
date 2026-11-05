import { pool, withTransaction } from '../../infra/db.js';
import { conditionsRepository } from './conditions.repository.js';
import { AppError } from '../../middleware/error-handler.js';
import { logger } from '../../infra/logger.js';

export const conditionsService = {
  async searchConditions({ q = '', limit = 20, category = null } = {}) {
    return conditionsRepository.search(pool, { q, limit, category });
  },

  async getConditionByIdOrCode(idOrCode) {
    const condition = await conditionsRepository.findByIdOrCode(pool, idOrCode);
    if (!condition) {
      throw new AppError('CONDITION_NOT_FOUND', `Condition with identifier "${idOrCode}" not found`, 404);
    }
    return condition;
  },

  async createCondition(data, actorId) {
    return withTransaction(async (client) => {
      const existing = await conditionsRepository.findByIdOrCode(client, data.code);
      if (existing) {
        throw new AppError('CONDITION_ALREADY_EXISTS', `Condition code "${data.code}" already exists`, 409);
      }

      const condition = await conditionsRepository.create(client, {
        code: data.code,
        name: data.name,
        aliases: data.aliases || [],
        icd10: data.icd10 || null,
        category: data.category,
        severityDefault: data.severityDefault
      });

      let requirements = [];
      if (data.requirements && data.requirements.length > 0) {
        requirements = await conditionsRepository.replaceRequirements(client, condition.id, data.requirements);
      }

      logger.info({ conditionId: condition.id, code: condition.code, actorId }, '[Conditions] Created new condition');

      return {
        ...condition,
        requirements
      };
    });
  },

  async updateCondition(id, data, actorId) {
    return withTransaction(async (client) => {
      const existing = await conditionsRepository.findByIdOrCode(client, id);
      if (!existing) {
        throw new AppError('CONDITION_NOT_FOUND', `Condition "${id}" not found`, 404);
      }

      const updated = await conditionsRepository.update(client, existing.id, {
        name: data.name,
        aliases: data.aliases,
        icd10: data.icd10,
        category: data.category,
        severityDefault: data.severityDefault
      });

      let requirements = existing.requirements;
      if (data.requirements !== undefined) {
        requirements = await conditionsRepository.replaceRequirements(client, existing.id, data.requirements);
      }

      logger.info({ conditionId: existing.id, actorId }, '[Conditions] Updated condition');

      return {
        ...updated,
        requirements
      };
    });
  },

  async deleteCondition(id, actorId) {
    return withTransaction(async (client) => {
      const existing = await conditionsRepository.findByIdOrCode(client, id);
      if (!existing) {
        throw new AppError('CONDITION_NOT_FOUND', `Condition "${id}" not found`, 404);
      }

      await conditionsRepository.delete(client, existing.id);
      logger.info({ conditionId: existing.id, code: existing.code, actorId }, '[Conditions] Deleted condition');

      return { id: existing.id, code: existing.code, deleted: true };
    });
  }
};

