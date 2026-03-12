import { useDatabaseContext } from "../context/DatabaseContext";

export const useDatabase = () => {
  return useDatabaseContext();
};
