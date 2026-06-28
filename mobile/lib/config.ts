import AsyncStorage from "@react-native-async-storage/async-storage";
import { setApiUrl, getApiUrl } from "./api";

const STORAGE_KEY = "empresario_api_url";

export async function loadApiUrl(): Promise<string> {
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  if (saved) {
    setApiUrl(saved);
    return saved;
  }
  const current = getApiUrl();
  return current;
}

export async function saveApiUrl(url: string): Promise<void> {
  const normalized = url.replace(/\/$/, "");
  await AsyncStorage.setItem(STORAGE_KEY, normalized);
  setApiUrl(normalized);
}
