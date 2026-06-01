package permission

import (
	"github.com/casbin/casbin/v3"
	"github.com/casbin/casbin/v3/model"
)

type Enforcer struct{ e *casbin.Enforcer }

func NewEnforcer() (*Enforcer, error) {
	m, err := model.NewModelFromString(`
[request_definition]
r = sub, obj, act
[policy_definition]
p = sub, obj, act
[role_definition]
g = _, _
[policy_effect]
e = some(where (p.eft == allow))
[matchers]
m = g(r.sub, p.sub) && (p.obj == "*" || p.obj == r.obj) && (p.act == "*" || p.act == r.act)
`)
	if err != nil {
		return nil, err
	}
	e, err := casbin.NewEnforcer(m)
	if err != nil {
		return nil, err
	}
	_, _ = e.AddPolicy("admin", "*", "*")
	_, _ = e.AddPolicy("manager", "project", "*")
	_, _ = e.AddPolicy("manager", "task", "*")
	_, _ = e.AddPolicy("manager", "repository", "*")
	_, _ = e.AddPolicy("manager", "commit", "*")
	_, _ = e.AddPolicy("manager", "review", "*")
	_, _ = e.AddPolicy("manager", "test", "*")
	_, _ = e.AddPolicy("manager", "agent", "*")
	_, _ = e.AddPolicy("developer", "project", "read")
	_, _ = e.AddPolicy("developer", "task", "read")
	_, _ = e.AddPolicy("developer", "task", "update")
	_, _ = e.AddPolicy("developer", "agent", "read")
	_, _ = e.AddPolicy("developer", "agent", "write")
	return &Enforcer{e: e}, nil
}

func (p *Enforcer) Allow(role, obj, act string) bool {
	ok, err := p.e.Enforce(role, obj, act)
	return err == nil && ok
}
