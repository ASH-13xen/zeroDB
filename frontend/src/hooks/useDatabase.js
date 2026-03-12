import { useDatabaseContext } from "../context/DatabaseContext";

export const useDatabase = () => {
  // This cleanly hooks into your friend's new provider setup!
  return useDatabaseContext();
};
