import axios from 'axios';
import { neonDB } from '../db/neonDB';
import { similarUsersTable, rapidApiLogsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export interface SimilarUser {
  username: string;
  user_id?: string;
  full_name?: string;
  biography?: string;
  profile_pic_url?: string;
  profile_pic_url_hd?: string;
  is_private?: boolean;
  is_verified?: boolean;
  is_business_account?: boolean;
  is_joined_recently?: boolean;
  is_professional_account?: boolean;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  external_url?: string;
  business_category_name?: string;
  category_name?: string;
  similarity_score?: number;
  mutual_followers_count?: number;
  mutual_following_count?: number;
}

export interface RapidApiResponse {
  status: string;
  data?: SimilarUser[];
  message?: string;
  error?: string;
}

export class RapidApiService {
  private host: string;
  private apiKey: string;
  private db: typeof neonDB;

  constructor() {
    this.host = process.env.RAPIDAPI_HOST || 'real-time-instagram-scraper-api1.p.rapidapi.com';
    this.apiKey = process.env.RAPIDAPI_KEY || '';
    this.db = neonDB;

    if (!this.apiKey) {
      throw new Error('RAPIDAPI_KEY is required');
    }
  }

  /**
   * Получает похожих пользователей для указанного username
   */
  async getSimilarUsers(username: string, projectId: number): Promise<SimilarUser[]> {
    const startTime = Date.now();
    let responseCode: number | undefined;
    let errorMessage: string | undefined;
    let usersFound = 0;
    let usersSaved = 0;

    try {
      console.log(`🔍 Поиск похожих пользователей для: ${username}`);

      const response = await axios.get<RapidApiResponse>(
        `https://${this.host}/v1/similar_users_v2`,
        {
          params: {
            username_or_id: username
          },
          headers: {
            'x-rapidapi-host': this.host,
            'x-rapidapi-key': this.apiKey
          },
          timeout: 30000 // 30 секунд таймаут
        }
      );

      responseCode = response.status;
      const responseTime = Date.now() - startTime;

      if (response.data.status === 'success' && response.data.data) {
        usersFound = response.data.data.length;
        console.log(`✅ Найдено ${usersFound} похожих пользователей`);

        // Сохраняем пользователей в базу данных
        usersSaved = await this.saveSimilarUsers(response.data.data, username, projectId);

        // Логируем успешный запрос
        await this.logApiCall({
          projectId,
          endpoint: 'similar_users_v2',
          username_or_id: username,
          status: 'success',
          response_code: responseCode,
          response_time_ms: responseTime,
          users_found: usersFound,
          users_saved: usersSaved,
          raw_response: response.data
        });

        return response.data.data;
      } else {
        errorMessage = response.data.message || response.data.error || 'Unknown error';
        console.error(`❌ API вернул ошибку: ${errorMessage}`);

        // Логируем ошибку
        await this.logApiCall({
          projectId,
          endpoint: 'similar_users_v2',
          username_or_id: username,
          status: 'error',
          response_code: responseCode,
          response_time_ms: Date.now() - startTime,
          error_message: errorMessage,
          raw_response: response.data
        });

        return [];
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      errorMessage = error.message || 'Unknown error';

      console.error(`❌ Ошибка при запросе к RapidAPI: ${errorMessage}`);

      // Логируем ошибку
      await this.logApiCall({
        projectId,
        endpoint: 'similar_users_v2',
        username_or_id: username,
        status: 'error',
        response_code: error.response?.status,
        response_time_ms: responseTime,
        error_message: errorMessage,
        raw_response: error.response?.data
      });

      return [];
    }
  }

  /**
   * Сохраняет похожих пользователей в базу данных
   */
  private async saveSimilarUsers(
    users: SimilarUser[], 
    sourceUsername: string, 
    projectId: number
  ): Promise<number> {
    let savedCount = 0;

    for (const user of users) {
      try {
        // Проверяем, существует ли уже такой пользователь для этого проекта
        const existingUser = await this.db
          .select()
          .from(similarUsersTable)
          .where(
            and(
              eq(similarUsersTable.project_id, projectId),
              eq(similarUsersTable.username, user.username)
            )
          )
          .limit(1);

        if (existingUser.length === 0) {
          // Вставляем нового пользователя
          await this.db.insert(similarUsersTable).values({
            project_id: projectId,
            source_username: sourceUsername,
            username: user.username,
            user_id: user.user_id,
            full_name: user.full_name,
            biography: user.biography,
            profile_pic_url: user.profile_pic_url,
            profile_pic_url_hd: user.profile_pic_url_hd,
            is_private: user.is_private,
            is_verified: user.is_verified,
            is_business_account: user.is_business_account,
            is_joined_recently: user.is_joined_recently,
            is_professional_account: user.is_professional_account,
            followers_count: user.followers_count,
            following_count: user.following_count,
            posts_count: user.posts_count,
            external_url: user.external_url,
            business_category_name: user.business_category_name,
            category_name: user.category_name,
            similarity_score: user.similarity_score,
            mutual_followers_count: user.mutual_followers_count,
            mutual_following_count: user.mutual_following_count,
            raw_data: user
          });

          savedCount++;
          console.log(`💾 Сохранен пользователь: ${user.username}`);
        } else {
          console.log(`⏭️ Пользователь уже существует: ${user.username}`);
        }
      } catch (error) {
        console.error(`❌ Ошибка при сохранении пользователя ${user.username}:`, error);
      }
    }

    return savedCount;
  }

  /**
   * Логирует API вызовы
   */
  private async logApiCall(logData: {
    projectId: number;
    endpoint: string;
    username_or_id: string;
    status: string;
    response_code?: number;
    response_time_ms: number;
    users_found?: number;
    users_saved?: number;
    error_message?: string;
    raw_response?: any;
  }) {
    try {
      await this.db.insert(rapidApiLogsTable).values({
        project_id: logData.projectId,
        endpoint: logData.endpoint,
        username_or_id: logData.username_or_id,
        status: logData.status,
        response_code: logData.response_code,
        response_time_ms: logData.response_time_ms,
        users_found: logData.users_found,
        users_saved: logData.users_saved,
        error_message: logData.error_message,
        raw_response: logData.raw_response
      });
    } catch (error) {
      console.error('❌ Ошибка при логировании API вызова:', error);
    }
  }

  /**
   * Получает статистику по API вызовам
   */
  async getApiStats(projectId: number, days: number = 7) {
    const stats = await this.db
      .select({
        total_calls: this.db.fn.count(),
        success_calls: this.db.fn.count().filter(eq(rapidApiLogsTable.status, 'success')),
        error_calls: this.db.fn.count().filter(eq(rapidApiLogsTable.status, 'error')),
        avg_response_time: this.db.fn.avg(rapidApiLogsTable.response_time_ms),
        total_users_found: this.db.fn.sum(rapidApiLogsTable.users_found),
        total_users_saved: this.db.fn.sum(rapidApiLogsTable.users_saved)
      })
      .from(rapidApiLogsTable)
      .where(
        and(
          eq(rapidApiLogsTable.project_id, projectId),
          // Фильтр по дате (последние N дней)
          // Здесь можно добавить фильтр по дате если нужно
        )
      );

    return stats[0];
  }
} 