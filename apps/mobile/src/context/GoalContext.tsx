import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { Storage } from "../lib/storage";
import { api } from "../lib/api";
import { TOKENS } from "../theme/tokens";

let AppStateModule: any = null;
try {
  AppStateModule = require("react-native").AppState;
} catch (err: unknown) {
  void err;
}

export interface Goal {
  id: string;
  name: string;
  fullName: string;
  category: string;
  iconName: string;
}

export const POPULAR_GOALS: Goal[] = [
  {
    id: "upsc",
    name: "UPSC",
    fullName: "UPSC Civil Services Examination",
    category: "Civil Services",
    iconName: "Landmark",
  },
  {
    id: "bpsc",
    name: "BPSC",
    fullName: "Bihar Public Service Commission",
    category: "State PSC",
    iconName: "Building",
  },
  {
    id: "ssc-cgl",
    name: "SSC CGL",
    fullName: "Combined Graduate Level Exam",
    category: "Staff Selection",
    iconName: "Shield",
  },
  {
    id: "railways-rrb",
    name: "Railways RRB",
    fullName: "Railway Recruitment Board NTPC / Group D",
    category: "Railways",
    iconName: "Train",
  },
  {
    id: "banking-ibps",
    name: "Banking IBPS",
    fullName: "IBPS PO / Clerk / SBI Exams",
    category: "Banking",
    iconName: "DollarSign",
  },
  {
    id: "defence-nda",
    name: "Defence NDA / CDS",
    fullName: "National Defence Academy & CDS",
    category: "Defence",
    iconName: "ShieldAlert",
  },
  {
    id: "teaching-ctet",
    name: "Teaching CTET",
    fullName: "Central Teacher Eligibility Test",
    category: "Teaching",
    iconName: "GraduationCap",
  },
  {
    id: "gate-engineering",
    name: "GATE Engineering",
    fullName: "Graduate Aptitude Test in Engineering",
    category: "Engineering",
    iconName: "Cpu",
  },
];

export const DEFAULT_GOAL = POPULAR_GOALS[0];

export interface GoalContextValue {
  selectedGoal: Goal;
  selectedGoalIds: string[];
  allGoals: Goal[];
  isLoaded: boolean;
  isGoalModalOpen: boolean;
  couldNotSyncGoal: boolean;
  selectGoal: (goal: Goal) => void;
  openGoalModal: () => void;
  closeGoalModal: () => void;
  retrySyncGoal: () => Promise<void>;
}

const GoalContext = createContext<GoalContextValue | undefined>(undefined);

export function GoalProvider({ children }: { children: React.ReactNode }) {
  const [selectedGoal, setSelectedGoal] = useState<Goal>(DEFAULT_GOAL);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [couldNotSyncGoal, setCouldNotSyncGoal] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    void Storage.getGoal().then((savedId) => {
      if (!active) return;
      if (savedId) {
        const found = POPULAR_GOALS.find(
          (g) => g.id.toLowerCase() === savedId.toLowerCase()
        );
        if (found) {
          setSelectedGoal(found);
        }
      }
      setIsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const selectGoal = useCallback((goal: Goal) => {
    setSelectedGoal(goal);
    void Storage.setGoal(goal.id);
    void api.updateMe({ goal: goal.id }).then(
      (res) => {
        if (!res.ok) {
          setCouldNotSyncGoal(true);
        } else {
          setCouldNotSyncGoal(false);
        }
      },
      () => {
        setCouldNotSyncGoal(true);
      }
    );
    setIsGoalModalOpen(false);
  }, []);

  const retrySyncGoal = useCallback(async () => {
    if (!selectedGoal) return;
    const res = await api.updateMe({ goal: selectedGoal.id });
    if (res.ok) {
      setCouldNotSyncGoal(false);
    } else {
      setCouldNotSyncGoal(true);
    }
  }, [selectedGoal]);

  useEffect(() => {
    if (!AppStateModule?.addEventListener) return;
    const subscription = AppStateModule.addEventListener("change", (nextState: string) => {
      if (nextState === "active" && couldNotSyncGoal && selectedGoal) {
        void api.updateMe({ goal: selectedGoal.id }).then(
          (res) => {
            if (res.ok) {
              setCouldNotSyncGoal(false);
            }
          },
          () => {
            // Keep error flag active for subsequent retry
          }
        );
      }
    });
    return () => {
      subscription.remove();
    };
  }, [couldNotSyncGoal, selectedGoal]);

  const openGoalModal = useCallback(() => setIsGoalModalOpen(true), []);
  const closeGoalModal = useCallback(() => setIsGoalModalOpen(false), []);

  const value = useMemo<GoalContextValue>(
    () => ({
      selectedGoal,
      selectedGoalIds: [selectedGoal.id],
      allGoals: POPULAR_GOALS,
      isLoaded,
      isGoalModalOpen,
      couldNotSyncGoal,
      selectGoal,
      openGoalModal,
      closeGoalModal,
      retrySyncGoal,
    }),
    [
      selectedGoal,
      isLoaded,
      isGoalModalOpen,
      couldNotSyncGoal,
      selectGoal,
      openGoalModal,
      closeGoalModal,
      retrySyncGoal,
    ]
  );

  return <GoalContext.Provider value={value}>{children}</GoalContext.Provider>;
}

export function useGoal(): GoalContextValue {
  const context = useContext(GoalContext);
  if (!context) {
    return {
      selectedGoal: DEFAULT_GOAL,
      selectedGoalIds: [DEFAULT_GOAL.id],
      allGoals: POPULAR_GOALS,
      isLoaded: true,
      isGoalModalOpen: false,
      couldNotSyncGoal: false,
      selectGoal: () => {},
      openGoalModal: () => {},
      closeGoalModal: () => {},
      retrySyncGoal: async () => {},
    };
  }
  return context;
}
