import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, Image, Keyboard, KeyboardAvoidingView, PanResponder, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { acceptFriendRequest, addFriend, blockFriend, getDirectMessageThreadId, getUnreadDirectMessageCount, markDirectMessagesAsRead, rejectFriendRequest, removeFriend, sendDirectMessageToFriend, sendSupportMessage, toggleChatNotifications, useAppDb } from "@/data/db";
import { colors, radius, spacing, typography } from "@/theme/theme";
import { DirectMessage } from "@/types";

const getMessageDate = (message: DirectMessage) => {
  const value = message.createdAt ?? (message.timestamp.includes("T") ? message.timestamp : null);
  if (!value || Number.isNaN(new Date(value).getTime())) {
    return null;
  }
  return new Date(value);
};

const formatMessageDay = (message: DirectMessage) => {
  const date = getMessageDate(message);
  return date ? new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" }).format(date) : null;
};

const formatMessageTime = (message: DirectMessage) => {
  const date = getMessageDate(message);
  return date ? date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : message.timestamp;
};

function SwipeableFriendRow({ children, onBlock, onRemove, onToggleMute, isMuted, onPress, allowContactActions = true }: { children: React.ReactNode; onBlock: () => void; onRemove: () => void; onToggleMute: () => void; isMuted: boolean; onPress: () => void; allowContactActions?: boolean }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const actionWidth = allowContactActions ? 230 : 76;
  const [isOpen, setIsOpen] = useState(false);
  const close = () => {
    setIsOpen(false);
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
  };
  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) => translateX.setValue(Math.max(0, Math.min(gesture.dx, actionWidth))),
    onPanResponderRelease: (_, gesture) => {
      const nextOpen = gesture.dx > 80;
      setIsOpen(nextOpen);
      Animated.spring(translateX, { toValue: nextOpen ? actionWidth : 0, useNativeDriver: true, bounciness: 0 }).start();
    },
  })).current;

  return (
    <View style={styles.swipeRowShell}>
      <View style={styles.swipeActions}>
        <TouchableOpacity style={styles.swipeActionMute} onPress={onToggleMute}>
          <Ionicons name={isMuted ? "notifications-outline" : "notifications-off-outline"} size={16} color={colors.white} />
          <Text style={styles.swipeActionText}>{isMuted ? "Laut" : "Stumm"}</Text>
        </TouchableOpacity>
        {allowContactActions ? (
          <>
            <TouchableOpacity style={styles.swipeActionRemove} onPress={onRemove}>
              <Ionicons name="person-remove-outline" size={16} color={colors.white} />
              <Text style={styles.swipeActionText}>Entfernen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.swipeActionBlock} onPress={onBlock}>
              <Ionicons name="ban-outline" size={16} color={colors.white} />
              <Text style={styles.swipeActionText}>Blockieren</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
      <Animated.View style={[styles.swipeRowForeground, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
          {children}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function MatchingScreen() {
  const db = useAppDb();
  const currentUser = db.users.find((user) => user.id === db.currentUserId) ?? null;
  const friends = currentUser
    ? (currentUser.friends ?? [])
        .map((friendId) => db.users.find((user) => user.id === friendId))
        .filter((friend): friend is NonNullable<typeof friend> => Boolean(friend))
    : [];
  const friendRequests = currentUser
    ? (currentUser.friendRequests ?? [])
        .map((requesterId) => db.users.find((user) => user.id === requesterId))
        .filter((requester): requester is NonNullable<typeof requester> => Boolean(requester))
    : [];
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [chatActionsVisible, setChatActionsVisible] = useState(false);
  const [webKeyboardOffset, setWebKeyboardOffset] = useState(0);
  const supportContact = db.users.find((user) => user.username.toLowerCase() === "ata") ?? {
    id: "support-account",
    name: "Ata",
    avatarColor: "#7C6CFF",
    profileImage: null,
    online: true,
  };
  const isSupportChat = selectedFriendId === "support-account";
  const selectedFriend = friends.find((friend) => friend.id === selectedFriendId) ?? (isSupportChat ? supportContact : null);
  const messages = selectedFriend
    ? isSupportChat
      ? db.directMessages[`support:${currentUser?.id ?? ""}`] ?? []
      : db.directMessages[currentUser ? getDirectMessageThreadId(currentUser.id, selectedFriend.id) : ""] ?? db.directMessages[selectedFriend.id] ?? []
    : [];
  const supportMessages = db.directMessages[`support:${currentUser?.id ?? ""}`] ?? [];
  const supportThreadId = `support:${currentUser?.id ?? ""}`;
  const supportUnreadCount = getUnreadDirectMessageCount(supportMessages, currentUser?.id ?? null, Boolean(currentUser?.notificationsMuted || currentUser?.mutedChatThreadIds?.includes(supportThreadId)));
  const messagesScrollRef = useRef<ScrollView>(null);
  const activeThreadId = isSupportChat ? `support:${currentUser?.id ?? ""}` : currentUser && selectedFriend ? getDirectMessageThreadId(currentUser.id, selectedFriend.id) : "";

  useEffect(() => {
    if (selectedFriend) {
      requestAnimationFrame(() => messagesScrollRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length, selectedFriendId]);

  useEffect(() => {
    if (selectedFriend && activeThreadId) {
      markDirectMessagesAsRead(activeThreadId);
    }
  }, [activeThreadId, messages.length, selectedFriendId]);

  useEffect(() => {
    if (!selectedFriend || Platform.OS === "web") {
      return;
    }

    const keyboardSubscription = Keyboard.addListener("keyboardDidShow", () => {
      requestAnimationFrame(() => messagesScrollRef.current?.scrollToEnd({ animated: true }));
    });

    return () => keyboardSubscription.remove();
  }, [selectedFriendId]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || !window.visualViewport) {
      return;
    }

    const viewport = window.visualViewport;
    const updateKeyboardOffset = () => {
      setWebKeyboardOffset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    };

    updateKeyboardOffset();
    viewport.addEventListener("resize", updateKeyboardOffset);
    viewport.addEventListener("scroll", updateKeyboardOffset);
    return () => {
      viewport.removeEventListener("resize", updateKeyboardOffset);
      viewport.removeEventListener("scroll", updateKeyboardOffset);
    };
  }, []);
  const searchResult = searchEmail.trim().toLowerCase().endsWith("@study2buddy.de")
    ? db.users.find((user) =>
        user.id !== currentUser?.id
        && !(currentUser?.friends ?? []).includes(user.id)
        && !(currentUser?.friendRequests ?? []).includes(user.id)
        && (user.internalEmail ?? user.email).toLowerCase() === searchEmail.trim().toLowerCase()
      ) ?? null
    : null;

  const sendMessage = () => {
    if (!selectedFriend || !draft.trim()) return;
    if (isSupportChat) {
      sendSupportMessage(draft);
    } else {
      sendDirectMessageToFriend(selectedFriend.id, draft);
    }
    setDraft("");
  };

  const performFriendAction = (action: "remove" | "block") => {
    if (!selectedFriend || isSupportChat) {
      return;
    }

    setChatActionsVisible(false);
    const execute = () => {
      if (action === "remove") removeFriend(selectedFriend.id);
      if (action === "block") blockFriend(selectedFriend.id);
      setSelectedFriendId(null);
    };
    const label = action === "remove" ? "Freund entfernen" : "Blockieren";
    if (Platform.OS === "web") {
      if (window.confirm(`${label}: ${selectedFriend.name}?`)) execute();
      return;
    }
    Alert.alert(label, `${selectedFriend.name} wirklich ${action === "remove" ? "entfernen" : "blockieren"}?`, [
      { text: "Abbrechen", style: "cancel" },
      { text: label, style: "destructive", onPress: execute },
    ]);
  };

  const confirmFriendAction = (friend: typeof friends[number], action: "remove" | "block") => {
    const label = action === "remove" ? "Freund entfernen" : "Blockieren";
    const execute = () => {
      if (action === "remove") removeFriend(friend.id);
      if (action === "block") blockFriend(friend.id);
    };
    if (Platform.OS === "web") {
      if (window.confirm(`${label}: ${friend.name}?`)) execute();
      return;
    }
    Alert.alert(label, `${friend.name} wirklich ${action === "remove" ? "entfernen" : "blockieren"}?`, [
      { text: "Abbrechen", style: "cancel" },
      { text: label, style: "destructive", onPress: execute },
    ]);
  };

  const toggleSelectedChatMute = () => {
    if (!activeThreadId) {
      return;
    }
    toggleChatNotifications(activeThreadId);
    setChatActionsVisible(false);
  };

  if (selectedFriend) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.container}>
          <View style={styles.desktopShell}>
          <View style={styles.chatTopBar}>
            <TouchableOpacity style={styles.backButton} onPress={() => setSelectedFriendId(null)} hitSlop={8}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            {selectedFriend.profileImage ? (
              <Image source={{ uri: selectedFriend.profileImage }} style={styles.chatAvatar} />
            ) : (
              <View style={[styles.chatAvatar, { backgroundColor: selectedFriend.avatarColor }]}>
                <Text style={styles.avatarText}>{selectedFriend.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.chatIdentity}>
              <Text style={styles.chatName}>{selectedFriend.name}</Text>
              <Text style={styles.chatStatus}>{isSupportChat ? "StudFlow-Support" : selectedFriend.online ? "Online" : "Offline"}</Text>
            </View>
            <TouchableOpacity onPress={() => setChatActionsVisible((visible) => !visible)} hitSlop={8}>
              <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            {chatActionsVisible ? (
              <View style={styles.chatActionsMenu}>
                <TouchableOpacity style={styles.chatActionItem} onPress={toggleSelectedChatMute}>
                  <Ionicons name={currentUser?.mutedChatThreadIds?.includes(activeThreadId) ? "notifications-outline" : "notifications-off-outline"} size={17} color={colors.textPrimary} />
                  <Text style={styles.chatActionText}>{currentUser?.mutedChatThreadIds?.includes(activeThreadId) ? "Chat laut stellen" : "Chat stummschalten"}</Text>
                </TouchableOpacity>
                {!isSupportChat ? (
                  <>
                <TouchableOpacity style={styles.chatActionItem} onPress={() => performFriendAction("remove")}>
                  <Ionicons name="person-remove-outline" size={17} color={colors.textPrimary} />
                  <Text style={styles.chatActionText}>Freund entfernen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.chatActionItem} onPress={() => performFriendAction("block")}>
                  <Ionicons name="ban-outline" size={17} color="#C0392B" />
                  <Text style={[styles.chatActionText, styles.chatActionDanger]}>Blockieren</Text>
                </TouchableOpacity>
                  </>
                ) : null}
              </View>
            ) : null}
          </View>
          <KeyboardAvoidingView
            behavior={Platform.OS === "web" ? undefined : "padding"}
            keyboardVerticalOffset={Platform.OS === "web" ? 0 : 56}
            style={[styles.chatContent, Platform.OS === "web" && webKeyboardOffset > 0 ? { transform: [{ translateY: -webKeyboardOffset }] } : undefined]}
          >
          <ScrollView ref={messagesScrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {messages.length === 0 ? (
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubble-ellipses-outline" size={30} color={colors.primary} />
                <Text style={styles.emptyChatTitle}>Noch keine Nachrichten</Text>
                <Text style={styles.emptyChatText}>Schreib {selectedFriend.name} eine Nachricht.</Text>
              </View>
            ) : (
              messages.map((message, messageIndex) => {
                const messageDay = formatMessageDay(message);
                const previousMessageDay = messageIndex > 0 ? formatMessageDay(messages[messageIndex - 1]) : null;
                const showDaySeparator = Boolean(messageDay && messageDay !== previousMessageDay);

                return (
                  <React.Fragment key={message.id}>
                    {showDaySeparator ? (
                      <View style={styles.daySeparator}>
                        <Text style={styles.daySeparatorText}>{messageDay}</Text>
                      </View>
                    ) : null}
                    <View style={[styles.messageRow, message.senderId === currentUser?.id && styles.messageRowMe]}>
                      <View style={[styles.bubble, message.senderId === currentUser?.id ? styles.bubbleMe : styles.bubbleFriend]}>
                        <Text style={[styles.messageText, message.senderId === currentUser?.id && styles.messageTextMe]}>{message.text}</Text>
                        <Text style={[styles.messageTime, message.senderId === currentUser?.id && styles.messageTimeMe]}>{formatMessageTime(message)}</Text>
                      </View>
                    </View>
                  </React.Fragment>
                );
              })
            )}
          </ScrollView>

          <View style={styles.composer}>
            <View style={styles.messageInputShell}>
              <TextInput value={draft} onChangeText={setDraft} blurOnSubmit onSubmitEditing={sendMessage} placeholder="Nachricht schreiben" placeholderTextColor={colors.textMuted} style={styles.messageInput} />
              <TouchableOpacity style={[styles.sendButton, !draft.trim() && styles.sendButtonDisabled]} onPress={sendMessage} disabled={!draft.trim()} hitSlop={6}>
                <Ionicons name="send" size={16} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardAvoidingView>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.desktopShell}>
      <View style={styles.header}>
        <Text style={typography.h1}>Freunde</Text>
        <Text style={styles.subtitle}>Schreib deinen Freunden direkt.</Text>
      </View>
      <View style={styles.searchBox}>
        <Text style={styles.searchLabel}>Freund über App-Mail hinzufügen</Text>
        <View style={styles.searchRow}>
          <TextInput
            value={searchEmail}
            onChangeText={setSearchEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="name@study2buddy.de"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
          <TouchableOpacity style={[styles.addButton, !searchResult && styles.addButtonDisabled]} onPress={() => { if (searchResult) { addFriend(searchResult.id); setSearchEmail(""); } }} disabled={!searchResult}>
            <Ionicons name="person-add" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
        {searchEmail.length > 0 && !searchResult ? <Text style={styles.searchHint}>Keine passende freie App-Mail gefunden.</Text> : null}
        {searchResult ? <Text style={styles.searchSuccess}>{searchResult.name} gefunden. Tippe auf + zum Hinzufügen.</Text> : null}
      </View>
      <ScrollView contentContainerStyle={styles.friendList} showsVerticalScrollIndicator={false}>
        {friendRequests.length > 0 ? (
          <View style={styles.requestsSection}>
            <Text style={styles.requestsTitle}>Freundschaftsanfragen</Text>
            {friendRequests.map((requester) => (
              <View key={requester.id} style={styles.requestRow}>
                <View style={[styles.friendAvatar, { backgroundColor: requester.avatarColor }]}>
                  <Text style={styles.avatarText}>{requester.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{requester.name}</Text>
                  <Text style={styles.friendPreview}>möchte dein Freund werden</Text>
                </View>
                <TouchableOpacity style={styles.acceptButton} onPress={() => acceptFriendRequest(requester.id)}>
                  <Ionicons name="checkmark" size={18} color={colors.white} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectButton} onPress={() => rejectFriendRequest(requester.id)}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}
        <SwipeableFriendRow
          onPress={() => setSelectedFriendId("support-account")}
          onBlock={() => undefined}
          onRemove={() => undefined}
          onToggleMute={() => toggleChatNotifications(supportThreadId)}
          isMuted={Boolean(currentUser?.mutedChatThreadIds?.includes(supportThreadId))}
          allowContactActions={false}
        >
          <View style={styles.friendRow}>
            <View style={[styles.friendAvatar, { backgroundColor: supportContact.avatarColor }]}>
              <Text style={styles.avatarText}>A</Text>
            </View>
            <View style={styles.friendInfo}>
              <View style={styles.friendTitleRow}>
                <Text style={styles.friendName}>Ata</Text>
                <View style={styles.onlineDot} />
              </View>
              <Text style={styles.friendPreview}>StudFlow-Support</Text>
            </View>
            {supportUnreadCount > 0 ? <View style={styles.messageCountBadge}><Text style={styles.messageCountText}>{supportUnreadCount > 99 ? "99+" : supportUnreadCount}</Text></View> : null}
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </SwipeableFriendRow>
        {friends.length === 0 ? (
          <View style={styles.emptyFriends}>
            <Ionicons name="people-outline" size={38} color={colors.primary} />
            <Text style={styles.emptyFriendsTitle}>Noch keine Freunde</Text>
            <Text style={styles.emptyFriendsText}>Füge zuerst Freunde hinzu, um ihnen Nachrichten zu schreiben.</Text>
          </View>
        ) : friends.map((friend) => {
          const friendMessages = (currentUser ? db.directMessages[getDirectMessageThreadId(currentUser.id, friend.id)] : null) ?? db.directMessages[friend.id] ?? [];
          const lastMessage = friendMessages[friendMessages.length - 1];
          const threadId = getDirectMessageThreadId(currentUser?.id ?? "", friend.id);
          const unreadCount = getUnreadDirectMessageCount(friendMessages, currentUser?.id ?? null, Boolean(currentUser?.notificationsMuted || currentUser?.mutedChatThreadIds?.includes(threadId)));
          return (
            <SwipeableFriendRow
              key={friend.id}
              onPress={() => setSelectedFriendId(friend.id)}
              onBlock={() => confirmFriendAction(friend, "block")}
              onRemove={() => confirmFriendAction(friend, "remove")}
              onToggleMute={() => toggleChatNotifications(threadId)}
              isMuted={Boolean(currentUser?.mutedChatThreadIds?.includes(threadId))}
            >
              <View style={styles.friendRow}>
                {friend.profileImage ? (
                  <Image source={{ uri: friend.profileImage }} style={styles.friendAvatar} />
                ) : (
                  <View style={[styles.friendAvatar, { backgroundColor: friend.avatarColor }]}>
                    <Text style={styles.avatarText}>{friend.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.friendInfo}>
                  <View style={styles.friendTitleRow}>
                    <Text style={styles.friendName}>{friend.name}</Text>
                    {friend.online ? <View style={styles.onlineDot} /> : null}
                  </View>
                  <Text style={styles.friendPreview} numberOfLines={1}>{lastMessage?.text ?? "Tippen, um zu chatten"}</Text>
                </View>
                <View style={styles.friendMeta}>
                  {unreadCount > 0 ? <View style={styles.messageCountBadge}><Text style={styles.messageCountText}>{unreadCount > 99 ? "99+" : unreadCount}</Text></View> : null}
                  {lastMessage ? <Text style={styles.messageTime}>{lastMessage.timestamp}</Text> : null}
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </View>
            </SwipeableFriendRow>
          );
        })}
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  desktopShell: { flex: 1, width: "100%", maxWidth: 760, alignSelf: "center" },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md },
  subtitle: { color: colors.textSecondary, marginTop: 4 },
  searchBox: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  searchLabel: { color: colors.textPrimary, fontWeight: "800", marginBottom: spacing.sm },
  searchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  searchInput: { flex: 1, minHeight: 44, backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, paddingHorizontal: spacing.md },
  addButton: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  addButtonDisabled: { opacity: 0.45 },
  searchHint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },
  searchSuccess: { color: colors.success, fontSize: 12, marginTop: spacing.sm },
  requestsSection: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  requestsTitle: { color: colors.textPrimary, fontWeight: "800", marginBottom: spacing.sm },
  requestRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  acceptButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.success, alignItems: "center", justifyContent: "center", marginLeft: spacing.xs },
  rejectButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.backgroundAlt, alignItems: "center", justifyContent: "center", marginLeft: spacing.xs },
  friendList: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  swipeRowShell: { position: "relative", overflow: "hidden" },
  swipeActions: { position: "absolute", left: 0, top: 0, bottom: 0, flexDirection: "row", alignItems: "stretch" },
  swipeActionMute: { width: 76, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", gap: 3 },
  swipeActionRemove: { width: 76, backgroundColor: "#B7791F", alignItems: "center", justifyContent: "center", gap: 3 },
  swipeActionBlock: { width: 78, backgroundColor: "#C0392B", alignItems: "center", justifyContent: "center", gap: 3 },
  swipeActionText: { color: colors.white, fontSize: 10, fontWeight: "800" },
  swipeRowForeground: { backgroundColor: colors.background },
  friendRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background },
  friendAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.white, fontSize: 20, fontWeight: "800" },
  friendInfo: { flex: 1, marginLeft: spacing.md },
  friendTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  friendName: { color: colors.textPrimary, fontSize: 16, fontWeight: "800" },
  friendPreview: { color: colors.textMuted, marginTop: 5, fontSize: 13 },
  friendMeta: { alignItems: "flex-end", gap: spacing.xs },
  messageCountBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#D92D3F", alignItems: "center", justifyContent: "center" },
  messageCountText: { color: colors.white, fontSize: 11, lineHeight: 13, fontWeight: "800", textAlign: "center" },
  onlineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.success, shadowColor: colors.success, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  emptyFriends: { alignItems: "center", paddingTop: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyFriendsTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "800", marginTop: spacing.md },
  emptyFriendsText: { color: colors.textSecondary, textAlign: "center", lineHeight: 20, marginTop: spacing.sm },
  chatTopBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  chatActionsMenu: { position: "absolute", top: 58, right: spacing.md, zIndex: 10, minWidth: 190, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.xs, shadowColor: colors.primary, shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  chatActionItem: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  chatActionText: { color: colors.textPrimary, fontWeight: "700", fontSize: 13 },
  chatActionDanger: { color: "#C0392B" },
  backButton: { marginRight: spacing.sm },
  chatAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  chatIdentity: { flex: 1, marginLeft: spacing.sm },
  chatName: { color: colors.textPrimary, fontWeight: "800", fontSize: 16 },
  chatStatus: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  chatContent: { flex: 1 },
  messages: { flex: 1 },
  messagesContent: { padding: spacing.lg, paddingBottom: spacing.md, flexGrow: 1 },
  emptyChat: { alignItems: "center", paddingTop: spacing.xxl },
  emptyChatTitle: { color: colors.textPrimary, fontWeight: "800", marginTop: spacing.md },
  emptyChatText: { color: colors.textSecondary, marginTop: spacing.xs },
  messageRow: { flexDirection: "row", marginBottom: spacing.sm },
  messageRowMe: { justifyContent: "flex-end" },
  daySeparator: { alignItems: "center", marginTop: spacing.sm, marginBottom: spacing.md },
  daySeparatorText: { color: colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  bubble: { maxWidth: "82%", borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleFriend: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  bubbleMe: { backgroundColor: colors.primary },
  messageText: { color: colors.textPrimary, fontSize: 15, lineHeight: 21 },
  messageTextMe: { color: colors.white },
  messageTime: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
  messageTimeMe: { color: "rgba(255,255,255,0.8)" },
  composer: { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border },
  messageInputShell: { position: "relative" },
  messageInput: { minHeight: 46, maxHeight: 110, backgroundColor: colors.background, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, paddingHorizontal: spacing.md, paddingRight: 56, paddingVertical: 12, fontSize: 15 },
  sendButton: { position: "absolute", right: 7, bottom: 7, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" },
  sendButtonDisabled: { opacity: 0.45 },
});
