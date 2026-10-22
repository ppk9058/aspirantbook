/* eslint-env jest */

// Safe Area Context
jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaConsumer: ({ children }: any) => children(inset),
    SafeAreaView: ({ children, ...props }: any) => React.createElement(View, props, children),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// Expo Keep Awake
jest.mock("expo-keep-awake", () => ({
  useKeepAwake: jest.fn(),
  activateKeepAwakeAsync: jest.fn(),
  deactivateKeepAwake: jest.fn(),
}));

// Expo Web Browser
jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn().mockResolvedValue({ type: "dismiss" }),
}));

// Expo Router variables prefixed with mock
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
let mockParams: Record<string, string> = {};
let mockPathname = "/";

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    canGoBack: mockCanGoBack,
  }),
  useLocalSearchParams: () => mockParams,
  usePathname: () => mockPathname,
  useSegments: () => [],
  Link: ({ children, href, onPress, ...props }: any) => {
    const React = require("react");
    const { TouchableOpacity } = require("react-native");
    return React.createElement(
      TouchableOpacity,
      {
        onPress: (e: any) => {
          if (onPress) onPress(e);
          mockPush(href);
        },
        ...props,
      },
      children
    );
  },
  __setMockParams: (params: any) => {
    mockParams = params;
  },
  __setMockPathname: (path: string) => {
    mockPathname = path;
  },
  __mockPush: mockPush,
  __mockReplace: mockReplace,
  __mockBack: mockBack,
}));
