"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { PostCard } from "@/components/ui/post-card"
import { LikeFavBar } from "@/components/ui/like-fav-bar"
import { RelationCounters } from "@/components/ui/relation-counters"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/auth-context"
import { knowpostService } from "@/lib/api/knowpost"
import type { FeedItem } from "@/lib/types/knowpost"

function parseTags(tagJson?: string): string[] {
  if (!tagJson) return []
  try {
    const parsed = JSON.parse(tagJson)
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string") : []
  } catch {
    return []
  }
}

export default function ProfilePage() {
  const { user, tokens } = useAuth()
  const displayName = user?.nickname ?? user?.phone ?? user?.email ?? "用户"

  const tags = useMemo(() => parseTags(user?.tagJson), [user?.tagJson])

  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reloadMine = useCallback(async () => {
    if (!tokens?.accessToken) return
    setLoading(true)
    setError(null)
    try {
      const resp = await knowpostService.mine(1, 20, tokens.accessToken)
      setItems(resp.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [tokens?.accessToken])

  useEffect(() => {
    void reloadMine()
  }, [reloadMine])

  return (
    <div className="flex flex-col gap-6 rounded-2xl bg-background/90 p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">我的主页</h1>
        <p className="text-sm text-muted-foreground">完善个人信息，积累你的知识资产</p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">个人信息</h2>
          <Link href="/app/profile/edit">
            <Button variant="outline" size="sm">
              编辑资料
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <UserAvatar
            src={user?.avatar || undefined}
            nickname={displayName}
            size="lg"
            className="size-20"
          />
          <div className="flex flex-col gap-1">
            <span className="text-xl font-bold">{displayName}</span>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {tags.length > 0
                ? tags.map((tag) => <span key={tag}>{tag}</span>)
                : <span>未设置标签</span>}
            </div>
          </div>
        </div>

        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {user?.bio ?? "暂无简介"}
        </p>

        {user?.id && <RelationCounters userId={user.id} />}

        <div className="border-t pt-4">
          <h2 className="mb-4 text-lg font-semibold">我的知文</h2>
          {error && (
            <div className="mb-4 text-sm text-destructive">{error}</div>
          )}
          {!user ? (
            <p className="text-sm text-muted-foreground">请登录后查看你的知文</p>
          ) : (
            <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
              {items.map((item) => (
                <div key={item.id} className="mb-6 break-inside-avoid">
                  <PostCard
                    id={item.id}
                    title={item.title}
                    summary={item.description ?? ""}
                    tags={item.tags ?? []}
                    isTop={item.isTop}
                    authorTags={parseTags(item.tagJson)}
                    teacher={{
                      name: item.authorNickname,
                      avatarUrl: item.authorAvatar ?? item.authorAvator,
                    }}
                    coverImage={item.coverImage}
                    to={`/app/posts/${item.id}`}
                    editable
                    onChanged={(action) => {
                      if (action === "delete") {
                        setItems((prev) => prev.filter((x) => x.id !== item.id))
                      } else {
                        void reloadMine()
                      }
                    }}
                    footerExtra={
                      <LikeFavBar
                        entityId={item.id}
                        compact
                        initialCounts={{
                          like: item.likeCount ?? 0,
                          fav: item.favoriteCount ?? 0,
                        }}
                        initialState={{
                          liked: item.liked,
                          faved: item.faved,
                        }}
                      />
                    }
                  />
                </div>
              ))}
              {loading && (
                <div className="text-center text-sm text-muted-foreground">
                  加载中…
                </div>
              )}
              {!loading && items.length === 0 && (
                <div className="text-center text-sm text-muted-foreground">
                  暂无内容
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
