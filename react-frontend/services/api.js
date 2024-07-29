import api from "./http.service";

export const request = {
  getInfo: () => api.get("/api/v1/users/me/"),
  signup: (data) => api.post("/api/v1/users/", data),
  login: (data) => api.post("/api/v1/token", data),
  getUserItems: () => api.get("/api/v1/users/me/items/"),
  createUserItem: (data) => api.post("/api/v1/users/me/items/", data),
  deleteUserItem: (itemId) => api.delete(`/api/v1/users/me/items/${itemId}`),
  requestPasswordReset: (data) => api.post("/api/v1/users/reset-password/", data),
  requestPasswordReset: (data) =>
    api.post("/api/v1/users/reset-password/", {
      email: data.email,
      frontend_url: data.frontendUrl,
    }),

  resetPassword: (data) =>
    api.post(`/api/v1/users/reset-password/${data.token}`, {
      new_password: data.new_password,
    }),
  
  updateProfile: (data) => api.put("/api/v1/users/me/", data),

  // Chat related requests
  chat: (data) => api.post("/api/v1/chat", data),
  getChats: ({ user_id, page, pageSize }) =>
    api.get(`/api/v1/chats?user_id=${user_id}&page=${page}&page_size=${pageSize}`),
  getChatMessages: ({ chatId, page, pageSize }) =>
    api.get(`/api/v1/chats/${chatId}/messages?page=${page}&page_size=${pageSize}`),

  deleteChat: (chatId) => api.delete(`/api/v1/chats/${chatId}`),
  archiveAllChats: (userId) =>
    api.post(`/api/v1/chats/archive_all`, { user_id: userId }),

  // Code related requests
  execute_code: (data) => api.post("/api/v1/execute_code", data),
};
