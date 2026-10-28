import React, { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { X, Search, Check, Target } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { useGoal, Goal } from "../../context/GoalContext";

export function GoalModal() {
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useTheme();
  const { allGoals, selectedGoal, isGoalModalOpen, closeGoalModal, selectGoal } =
    useGoal();

  const [searchQuery, setSearchQuery] = useState("");

  const filteredGoals = useMemo(() => {
    if (!searchQuery.trim()) return allGoals;
    const q = searchQuery.toLowerCase();
    return allGoals.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.fullName.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q)
    );
  }, [allGoals, searchQuery]);

  if (!isGoalModalOpen) return null;

  return (
    <Modal
      visible={isGoalModalOpen}
      transparent
      animationType="slide"
      onRequestClose={closeGoalModal}
      testID="goal-modal"
    >
      <View style={styles.modalRoot}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={closeGoalModal}>
          <View
            testID="goal-modal-backdrop"
            style={[
              styles.backdrop,
              { backgroundColor: colors.drawerBackdrop },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Modal Container */}
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: tokens.radius["2xl"],
              borderTopRightRadius: tokens.radius["2xl"],
              paddingBottom: Math.max(16, insets.bottom),
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              { borderBottomColor: colors.borderLight },
            ]}
          >
            <View style={styles.headerLeft}>
              <Target size={20} color={colors.primary} />
              <Text
                style={[
                  styles.title,
                  { color: colors.textPrimary },
                ]}
              >
                Select Target Goal
              </Text>
            </View>
            <TouchableOpacity
              onPress={closeGoalModal}
              testID="goal-modal-close"
              accessibilityLabel="Close goal selector"
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Search size={16} color={colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search exams & goals (UPSC, SSC, BPSC...)"
              placeholderTextColor={colors.textMuted}
              testID="goal-search-input"
              style={[
                styles.searchInput,
                { color: colors.textPrimary },
              ]}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>

          {/* Goals List */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filteredGoals.map((goal) => {
              const isSelected = selectedGoal.id === goal.id;

              return (
                <TouchableOpacity
                  key={goal.id}
                  onPress={() => selectGoal(goal)}
                  testID={`goal-item-${goal.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${goal.name}: ${goal.fullName}`}
                  accessibilityState={{ selected: isSelected }}
                  style={[
                    styles.goalCard,
                    {
                      backgroundColor: isSelected
                        ? colors.drawerActiveItemBg
                        : colors.surface,
                      borderColor: isSelected
                        ? colors.primary
                        : colors.border,
                      borderRadius: tokens.radius.xl,
                    },
                  ]}
                >
                  <View style={styles.goalInfo}>
                    <View style={styles.goalTitleRow}>
                      <Text
                        style={[
                          styles.goalNameText,
                          {
                            color: isSelected
                              ? colors.primary
                              : colors.textPrimary,
                          },
                        ]}
                      >
                        {goal.name}
                      </Text>
                      <View
                        style={[
                          styles.categoryBadge,
                          {
                            backgroundColor: colors.surfaceSecondary,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryText,
                            { color: colors.textMuted },
                          ]}
                        >
                          {goal.category}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.goalFullName,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {goal.fullName}
                    </Text>
                  </View>

                  {isSelected ? (
                    <View
                      style={[
                        styles.checkCircle,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  container: {
    width: "100%",
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    marginLeft: 8,
  },
  closeBtn: {
    padding: 4,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
    paddingVertical: 0,
  },
  list: {
    maxHeight: 380,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    marginVertical: 4,
    borderWidth: 1.5,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  goalNameText: {
    fontSize: 14,
    fontWeight: "800",
    marginRight: 8,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  goalFullName: {
    fontSize: 12,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
});
