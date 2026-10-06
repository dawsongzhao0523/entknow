// entKnow 后端入口。能力按 openspec 提案逐个生长，当前只有健康检查与版本信息。
package main

import (
	"flag"
	"log"
	"net/http"

	"github.com/dawsongzhao0523/entknow/backend/internal/server"
)

func main() {
	addr := flag.String("addr", ":8080", "监听地址")
	flag.Parse()

	log.Printf("entknow backend listening on %s", *addr)
	log.Fatal(http.ListenAndServe(*addr, server.New()))
}
