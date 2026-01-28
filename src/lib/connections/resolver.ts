// DreamTree Connection Resolver
// Fetches and transforms data based on connection definitions
// Refactored: Data fetchers extracted to data-fetchers.ts (B3)

import type { D1Database } from '@cloudflare/workers-types';
import type {
  ParsedConnection,
  ConnectionResult,
  FetchConnectionOptions,
  AutoPopulateParams,
  DataSourceType,
} from './types';

// Import extracted data fetchers
import {
  fetchTransferableSkills,
  fetchSoftSkills,
  fetchAllSkills,
  fetchKnowledgeSkills,
  fetchSOAREDStories,
  fetchExperiences,
  fetchFlowActivities,
  fetchValuesCompass,
  fetchWorkValues,
  fetchLifeValues,
  fetchCareerOptions,
  fetchBudget,
  fetchLocations,
  fetchMBTICode,
  fetchLifeDashboard,
  fetchProfileText,
  fetchCompetencyScores,
  fetchIdeaTrees,
  fetchUserLists,
} from './data-fetchers';

/**
 * Parse connection params from JSON string
 */
export function parseConnectionParams(
  method: string,
  paramsJson: string
): ParsedConnection['params'] { // code_id:115
  try {
    return JSON.parse(paramsJson);
  } catch (err) {
    console.error('[ConnectionResolver] Failed to parse connection params:', err);
    return { instructions: [] };
  }
}

/**
 * Main resolver class for fetching connected data
 */
export class ConnectionResolver {
  constructor(private db: D1Database) {}

  /**
   * Resolve a connection and fetch the relevant data
   */
  async resolve<T = unknown>(
    options: FetchConnectionOptions
  ): Promise<ConnectionResult<T>> { // code_id:458
    const { userId, connectionId } = options;

    // Fetch connection definition using actual schema columns
    const connection = await this.db
      .prepare(
        `SELECT id, connection_type, data_object, transform, implementation_notes
         FROM connections WHERE id = ?`
      )
      .bind(connectionId)
      .first<{
        id: number;
        connection_type: string;
        data_object: string;
        transform: string;
        implementation_notes: string;
      }>();

    if (!connection) {
      return {
        connectionId,
        method: 'custom',
        data: null,
        isEmpty: true,
        sourceExercise: null,
        error: `Connection ${connectionId} not found`,
      };
    }

    const connectionType = connection.connection_type;
    const params = parseConnectionParams(connectionType, connection.transform);

    // Route to appropriate handler based on connection_type
    // Map DB connection_type to resolver methods:
    // - 'forward' → fetch and pass user data forward
    // - 'resource' → link to reference data
    // - 'internal' → same-module data reuse (treat as forward)
    // - 'backward' → reverse lookup (treat as forward)
    // - 'framework' → framework reference (treat as custom)
    switch (connectionType) {
      case 'forward':
      case 'internal':
      case 'backward':
        return this.resolveAutoPopulate<T>(
          userId,
          connectionId,
          params as AutoPopulateParams
        );

      case 'resource':
        return this.resolveReferenceLink<T>(connectionId, params);

      case 'framework':
      default:
        // Custom/framework connections return params for tool-specific handling
        return {
          connectionId,
          method: 'custom',
          data: params as T,
          isEmpty: false,
          sourceExercise: null,
        };
    }
  }

  /**
   * Resolve auto_populate and hydrate connections
   */
  private async resolveAutoPopulate<T>(
    userId: string,
    connectionId: number,
    params: AutoPopulateParams
  ): Promise<ConnectionResult<T>> {
    const data = await this.fetchDataSource(userId, params.source, params);

    return {
      connectionId,
      method: 'auto_populate',
      data: data as T,
      isEmpty: !data || (Array.isArray(data) && data.length === 0),
      sourceExercise: params.from_exercise || params.from_module || null,
    };
  }

  /**
   * Resolve reference_link connections (static reference data)
   */
  private async resolveReferenceLink<T>(
    connectionId: number,
    params: unknown
  ): Promise<ConnectionResult<T>> {
    const refParams = params as { target: string; display: string };

    // Reference links point to static data like skills_master
    if (refParams.target === 'skills_master') {
      const skills = await this.db
        .prepare(
          `SELECT id, name, category FROM skills
           WHERE is_custom = 0 AND review_status = 'approved'
           ORDER BY category, name`
        )
        .all();

      return {
        connectionId,
        method: 'reference_link',
        data: skills.results as T,
        isEmpty: skills.results.length === 0,
        sourceExercise: null,
      };
    }

    return {
      connectionId,
      method: 'reference_link',
      data: null,
      isEmpty: true,
      sourceExercise: null,
    };
  }

  /**
   * Fetch data from a specific source type
   * Delegates to extracted data fetcher functions
   */
  private async fetchDataSource(
    userId: string,
    source: DataSourceType,
    params: AutoPopulateParams
  ): Promise<unknown> {
    switch (source) {
      case 'transferable_skills':
        return fetchTransferableSkills(this.db, userId, params.filter);

      case 'soft_skills':
        return fetchSoftSkills(this.db, userId);

      case 'all_skills':
        return fetchAllSkills(this.db, userId);

      case 'knowledge_skills':
        return fetchKnowledgeSkills(this.db, userId);

      case 'soared_stories':
        return fetchSOAREDStories(this.db, userId, params.filter);

      case 'experiences':
      case 'all_experiences':
        return fetchExperiences(this.db, userId);

      case 'employment_history':
        return fetchExperiences(this.db, userId, 'job');

      case 'education_history':
        return fetchExperiences(this.db, userId, 'education');

      case 'flow_tracking':
        return fetchFlowActivities(this.db, userId, params.filter);

      case 'values_compass':
        return fetchValuesCompass(this.db, userId);

      case 'work_values':
        return fetchWorkValues(this.db, userId);

      case 'life_values':
        return fetchLifeValues(this.db, userId);

      case 'career_options':
        return fetchCareerOptions(this.db, userId);

      case 'locations':
        return fetchLocations(this.db, userId);

      case 'budget':
        return fetchBudget(this.db, userId);

      case 'mbti_code':
        return fetchMBTICode(this.db, userId);

      case 'life_dashboard':
        return fetchLifeDashboard(this.db, userId);

      case 'competency_scores':
        return fetchCompetencyScores(this.db, userId);

      case 'idea_trees':
        return fetchIdeaTrees(this.db, userId);

      case 'lists':
        return fetchUserLists(this.db, userId, params.filter);

      case 'profile_text':
        return fetchProfileText(this.db, userId, params.filter);

      default:
        return null;
    }
  }
}
