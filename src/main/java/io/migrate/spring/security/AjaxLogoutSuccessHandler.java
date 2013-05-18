package io.migrate.spring.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

public class AjaxLogoutSuccessHandler implements LogoutSuccessHandler {

    public AjaxLogoutSuccessHandler() {
    }

    /**
     * Writes a simple text string to the response to let the caller know that authentication
     * was successful.
     */
    public void onLogoutSuccess(final HttpServletRequest request, final HttpServletResponse response, final Authentication authentication) throws IOException, ServletException {
        response.getWriter().print("LOGOUT_SUCCESS");
        response.getWriter().flush();
    }
}
