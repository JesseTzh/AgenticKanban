package cache

import (
	"time"

	"github.com/dgraph-io/ristretto/v2"
)

type Cache struct{ c *ristretto.Cache[string, any] }

func New() (*Cache, error) {
	c, err := ristretto.NewCache(&ristretto.Config[string, any]{NumCounters: 1e5, MaxCost: 64 << 20, BufferItems: 64})
	if err != nil {
		return nil, err
	}
	return &Cache{c: c}, nil
}

func (c *Cache) Get(key string) (any, bool)                   { return c.c.Get(key) }
func (c *Cache) Set(key string, value any, ttl time.Duration) { c.c.SetWithTTL(key, value, 1, ttl) }
func (c *Cache) Del(key string)                               { c.c.Del(key) }
func (c *Cache) Close()                                       { c.c.Close() }
