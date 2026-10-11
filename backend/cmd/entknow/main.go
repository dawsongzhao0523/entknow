// entKnow 后端入口：连接 PostgreSQL（幂等迁移 + 空库自动装载 demo），挂载 /healthz 与 /api/v1。
package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/dawsongzhao0523/entknow/backend/internal/llm"
	"github.com/dawsongzhao0523/entknow/backend/internal/server"
	"github.com/dawsongzhao0523/entknow/backend/internal/store"
)

const defaultDSN = "postgres://entknow:entknow@localhost:25432/entknow?sslmode=disable"

func main() {
	addr := flag.String("addr", ":28080", "监听地址")
	seed := flag.Bool("seed", false, "强制重置为 demo 数据（TRUNCATE + INSERT）")
	flag.Parse()

	dsn := os.Getenv("ENTKNOW_PG_DSN")
	if dsn == "" {
		dsn = defaultDSN
	}

	ctx := context.Background()
	st := connect(ctx, dsn)
	defer st.Close()

	if err := st.Migrate(ctx); err != nil {
		log.Fatalf("迁移失败: %v", err)
	}
	if *seed {
		if err := st.Seed(ctx); err != nil {
			log.Fatalf("demo 数据装载失败: %v", err)
		}
		log.Print("demo 数据已重置")
		return // -seed 为一次性命令：装载完成即退出（make demo）
	}
	if err := st.SeedIfEmpty(ctx); err != nil {
		log.Fatalf("demo 数据检查失败: %v", err)
	}

	mux := server.New()
	var llmc *llm.Client
	if cfg := llm.FromEnv(); cfg != nil {
		llmc = llm.New(*cfg)
		d := llmc.Describe()
		log.Printf("LLM 已接入: provider=%s model=%s", d["provider"], d["model"])
	} else {
		llmc = &llm.Client{} // 禁用态：AI 能力回退确定性规则引擎
		log.Print("LLM 未配置（ENTKNOW_LLM_PROVIDER 为空）：AI 建模走确定性规则引擎")
	}
	server.MountAPI(mux, st, llmc)

	// 启动后台定时调度器（CRON 模式数据源定期同步）
	scheduler := store.NewScheduler(st)
	scheduler.Start()
	defer scheduler.Stop()

	log.Printf("entknow backend listening on %s", *addr)
	log.Fatal(http.ListenAndServe(*addr, mux))
}

// connect 带重试建连（容器场景等 postgres 健康检查完成）。
func connect(ctx context.Context, dsn string) *store.Store {
	for i := 1; ; i++ {
		st, err := store.Connect(ctx, dsn)
		if err == nil {
			return st
		}
		if i >= 15 {
			log.Fatalf("数据库连接失败（重试 %d 次）: %v", i, err)
		}
		log.Printf("等待数据库就绪（%d/15）: %v", i, err)
		time.Sleep(2 * time.Second)
	}
}
