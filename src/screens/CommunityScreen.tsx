import React, { useState } from "react";
import { Alert, FlatList, Image, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Card from "@/components/Card";
import { addCommentToPost, addCommunityPost, addFriend, deleteCommunityPost, toggleLike, useAppDb } from "@/data/db";
import { colors, radius, spacing, typography } from "@/theme/theme";
import { CommunityPost } from "@/types";

function PostCard({ post, onLike, canAddFriend, onAddFriend, canDelete, onDelete, isThreadOpen, commentDraft, onToggleThread, onCommentDraftChange, onSubmitComment }: { post: CommunityPost; onLike: () => void; canAddFriend: boolean; onAddFriend: () => void; canDelete: boolean; onDelete: () => void; isThreadOpen: boolean; commentDraft: string; onToggleThread: () => void; onCommentDraftChange: (value: string) => void; onSubmitComment: () => void }) {
  const initial = post.author.charAt(0).toUpperCase();
  return (
    <Card style={styles.postCard}>
      <View style={styles.postHeader}>
        {post.profileImage ? (
          <Image source={{ uri: post.profileImage }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: post.avatarColor }]}> 
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={typography.bodyStrong}>{post.author}</Text>
          <Text style={typography.caption}>{post.course ? `${post.course} · ` : ""}{post.timeAgo}</Text>
        </View>
        {canAddFriend ? (
          <TouchableOpacity style={styles.addFriendButton} onPress={onAddFriend} hitSlop={8}>
            <Ionicons name="person-add-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
        {canDelete ? (
          <TouchableOpacity style={styles.deletePostButton} onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.accent} />
          </TouchableOpacity>
        ) : null}
        {post.unread ? <View style={styles.unread}><Text style={styles.unreadText}>{post.unread}</Text></View> : null}
      </View>

      <Text style={[typography.body, styles.postContent]}>{post.content}</Text>

      <View style={styles.postFooter}>
        <TouchableOpacity style={styles.footerAction} onPress={onLike}>
          <Ionicons name={post.likedByCurrentUser ? "heart" : "heart-outline"} size={16} color={post.likedByCurrentUser ? colors.accent : colors.textMuted} />
          <Text style={styles.footerText}>{post.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerAction} onPress={onToggleThread}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.textMuted} />
          <Text style={styles.footerText}>{post.comments}</Text>
        </TouchableOpacity>
      </View>

      {isThreadOpen ? (
        <View style={styles.thread}>
          {(post.commentsList ?? []).map((comment) => (
            <View key={comment.id} style={styles.commentRow}>
              <View style={styles.commentAvatar}><Text style={styles.commentAvatarText}>{comment.author.charAt(0).toUpperCase()}</Text></View>
              <View style={styles.commentBubble}>
                <Text style={styles.commentAuthor}>{comment.author}</Text>
                <Text style={styles.commentText}>{comment.text}</Text>
                <Text style={styles.commentTime}>{comment.timestamp}</Text>
              </View>
            </View>
          ))}
          <View style={styles.commentComposer}>
            <TextInput
              value={commentDraft}
              onChangeText={onCommentDraftChange}
              placeholder="Kommentar schreiben..."
              placeholderTextColor={colors.textMuted}
              style={styles.commentInput}
            />
            <TouchableOpacity style={styles.commentSendButton} onPress={onSubmitComment} disabled={!commentDraft.trim()}>
              <Ionicons name="send" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </Card>
  );
}

export default function CommunityScreen() {
  const { communityPosts, currentUserId, users } = useAppDb();
  const currentUser = users.find((user) => user.id === currentUserId) ?? null;
  const [draft, setDraft] = useState("");
  const [isPostComposerOpen, setIsPostComposerOpen] = useState(false);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const resolveAuthorId = (post: CommunityPost) => {
    if (post.authorId) {
      return post.authorId;
    }

    const matchingUsers = users.filter((user) => user.name === post.author);
    return matchingUsers.length === 1 ? matchingUsers[0].id : null;
  };

  const submitPost = () => {
    if (!draft.trim()) {
      Alert.alert("Beitrag leer", "Schreibe etwas, bevor du publizierst.");
      return;
    }

    addCommunityPost(draft);
    setDraft("");
    setIsPostComposerOpen(false);
  };

  const confirmDeletePost = async (postId: string) => {
    if (Platform.OS === "web") {
      if (!window.confirm("Diesen Beitrag wirklich löschen?")) {
        return;
      }
      try {
        await deleteCommunityPost(postId);
      } catch (error: any) {
        window.alert(error?.message ?? "Der Beitrag konnte nicht gelöscht werden.");
      }
      return;
    }

    Alert.alert("Beitrag löschen?", "Dieser Beitrag wird dauerhaft entfernt.", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCommunityPost(postId);
          } catch (error: any) {
            Alert.alert("Löschen fehlgeschlagen", error?.message ?? "Der Beitrag konnte nicht gelöscht werden.");
          }
        },
      },
    ]);
  };

  const visiblePosts = communityPosts.filter((post) => {
    if (!currentUser) return true;
    return post.author !== currentUser.name || post.profileImage !== null || post.author === currentUser.name;
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={typography.h1}>Community</Text>
        <Text style={styles.headerDescription}>Fragen stellen, Antworten bekommen und direkt in Kontakt treten.</Text>
      </View>

      <FlatList
        data={visiblePosts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const authorId = resolveAuthorId(item);
          const canAddFriend = Boolean(authorId && authorId !== currentUserId && !(currentUser?.friends ?? []).includes(authorId));
          return (
            <PostCard
              post={item}
              canAddFriend={canAddFriend}
              canDelete={item.authorId === currentUser?.id || (!item.authorId && item.author === currentUser?.name)}
              onDelete={() => confirmDeletePost(item.id)}
              onLike={() => toggleLike(item.id)}
              onAddFriend={() => { if (authorId) addFriend(authorId); }}
              isThreadOpen={openThreadId === item.id}
              commentDraft={commentDrafts[item.id] ?? ""}
              onToggleThread={() => setOpenThreadId((current) => current === item.id ? null : item.id)}
              onCommentDraftChange={(value) => setCommentDrafts((current) => ({ ...current, [item.id]: value }))}
              onSubmitComment={() => {
                if (!commentDrafts[item.id]?.trim()) return;
                addCommentToPost(item.id, commentDrafts[item.id]);
                setCommentDrafts((current) => ({ ...current, [item.id]: "" }));
              }}
            />
          );
        }}
        showsVerticalScrollIndicator={false}
      />
      {isPostComposerOpen ? (
        <View style={styles.postComposerPanel}>
          <View style={styles.inputShell}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Stell eine Frage an die Community..."
              placeholderTextColor={colors.textMuted}
              multiline
              style={styles.input}
            />
            <TouchableOpacity style={styles.newPostButton} onPress={submitPost} hitSlop={6}>
              <Ionicons name="arrow-up" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      <TouchableOpacity style={styles.fab} onPress={() => setIsPostComposerOpen((open) => !open)} activeOpacity={0.85}>
        <Ionicons name={isPostComposerOpen ? "close" : "add"} size={26} color={colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerDescription: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 140,
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
  },
  addFriendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.backgroundAlt,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  deletePostButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(30,79,216,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  friendsSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  friendList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  friendBadge: {
    width: "31%",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    alignItems: "center",
  },
  friendBadgeActive: {
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.primary,
  },
  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  friendAvatarText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 14,
  },
  friendName: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
  },
  friendNameActive: {
    color: colors.primary,
  },
  emptyFriends: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  friendSearchInput: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginTop: spacing.md,
    fontSize: 14,
  },
  friendAddList: {
    marginTop: spacing.md,
    gap: 8,
  },
  friendAddRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  friendAddName: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  friendAddMeta: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  addFriendSmallButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addFriendSmallText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 11,
  },
  friendSearchEmpty: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  chatPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  chatHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  friendActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  friendAction: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 9,
    alignItems: "center",
  },
  friendActionText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  friendActionDanger: {
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    borderColor: "rgba(220, 38, 38, 0.2)",
  },
  friendActionDangerText: {
    color: "#C62828",
  },
  chatTitle: {
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: 16,
  },
  chatMessages: {
    maxHeight: 220,
    gap: 8,
  },
  chatRow: {
    flexDirection: "row",
  },
  chatRowMe: {
    justifyContent: "flex-end",
  },
  chatBubble: {
    maxWidth: "80%",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chatBubbleOther: {
    backgroundColor: colors.backgroundAlt,
  },
  chatBubbleMe: {
    backgroundColor: colors.primary,
  },
  chatText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  chatTextMe: {
    color: colors.white,
  },
  chatTime: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
  chatTimeMe: {
    color: "rgba(255,255,255,0.8)",
  },
  emptyChat: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginVertical: spacing.sm,
  },
  friendInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  friendInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    includeFontPadding: false,
  },
  sendFriendButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  sendFriendText: {
    color: colors.white,
    fontWeight: "700",
  },
  postComposer: {
    marginBottom: spacing.md,
  },
  postComposerPanel: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: 76,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  inputShell: {
    flex: 1,
    position: "relative",
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
    maxHeight: 96,
    color: colors.textPrimary,
    padding: spacing.md,
    paddingRight: 52,
    textAlignVertical: "center",
    fontSize: 16,
    includeFontPadding: false,
  },
  newPostButton: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 32,
    height: 32,
    backgroundColor: colors.primary,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  postCard: {
    marginBottom: spacing.md,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
  },
  avatarText: {
    color: colors.white,
    fontWeight: "800",
  },
  unread: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: {
    fontSize: 11,
    color: colors.white,
    fontWeight: "700",
  },
  postContent: {
    marginBottom: spacing.sm,
  },
  postFooter: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  footerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  thread: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  commentAvatarText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "800",
  },
  commentBubble: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  commentAuthor: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
  },
  commentText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  commentTime: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 3,
  },
  commentComposer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 90,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.textPrimary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: 13,
  },
  commentSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
