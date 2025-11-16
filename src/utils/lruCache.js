// create a project-wide lru cache singleton
import { LRUCache as LRU } from 'lru-cache'

class LRUCache {
  constructor() {
    this.cacheSize = 100;
    if (LRUCache.instance) {
      return LRUCache.instance;
    }
    this.cache = new LRU({ max: this.cacheSize, ttl: 1000 * 60 * 30 });
    LRUCache.instance = this;
  }

  has(key) {
    return this.cache.has(key);
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value) {
    this.cache.set(key, value);
  }
}

export default new LRUCache();
