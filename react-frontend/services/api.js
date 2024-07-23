
import api from "./http.service";

export const request = {
  getInfo: () => api.get("/users/me/"),
  signup: (data) => api.post("/users/", data),
  login: (data) => {
    const formData = new URLSearchParams();
    formData.append("username", data.username);
    formData.append("password", data.password);
    return api.post("/token", formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  },
  getUserItems: () => api.get("/users/me/items/"),
  createUserItem: (data) => api.post("/users/me/items/", data),
  deleteUserItem: (itemId) => api.delete(`/users/me/items/${itemId}`),
  requestPasswordReset: (data) => api.post("/users/reset-password/", data),
  requestPasswordReset: (data) => api.post("/users/reset-password/", {
    email: data.email,
    frontend_url: data.frontendUrl 
  }),
  
  resetPassword: (data) => api.post(`/users/reset-password/${data.token}`, { new_password: data.new_password }),

  // Chat related requests
  chat: (data) => api.post("/chat", data),
  getChats: ({ user_id,page, pageSize }) => api.get(`/chats?user_id=${user_id}&page=${page}&page_size=${pageSize}`),
  getChatMessages: ({ chatId, page, pageSize }) => api.get(`/chats/${chatId}/messages?page=${page}&page_size=${pageSize}`),


  deleteChat: (chatId) => api.delete(`/chats/${chatId}`),
  archiveAllChats: (userId) => api.post(`/chats/archive_all`, { user_id: userId }),

};
