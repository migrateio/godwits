package io.migrate.spring.security;

import org.eclipse.jetty.util.ajax.JSON;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class AjaxAuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private static final Logger LOG = LoggerFactory.getLogger(AjaxAuthenticationSuccessHandler.class);

    public AjaxAuthenticationSuccessHandler() {
        super();
    }

    /**
     * Constructor which sets the <tt>defaultTargetUrl</tt> property of the base class.
     *
     * @param defaultTargetUrl the URL to which the user should be redirected on successful authentication.
     */
    public AjaxAuthenticationSuccessHandler(final String defaultTargetUrl) {
        super(defaultTargetUrl);
    }

    /**
     * Writes a simple text string to the response to let the caller know that authentication
     * was successful.
     */
    @Override
    public void onAuthenticationSuccess(final HttpServletRequest request, final HttpServletResponse response, final Authentication authentication) throws IOException, ServletException {
        LOG.debug("Authentication handler:", authentication);

        Object p = authentication.getPrincipal();
        Map<String, Object> userMap = new HashMap<String, Object>();

        if (p instanceof MigrateUser) {
            userMap = ((MigrateUser) p).getMap();
        }
        // User types are returned when Spring uses the in-memory auth provider
        else if (p instanceof User) {
            String username = ((User) p).getUsername();
            userMap.put("id", username);
            userMap.put("roles", ((User) p).getAuthorities().toArray());

            HashMap<String, Object> email = new HashMap<String, Object>();
            userMap.put("email", email);

            email.put("status", "verified");
            email.put("address", username + "@migrate.io");
        }

        Map<String, Object> map = new HashMap<String, Object>();
        map.put("status", "AUTH_SUCCESS");
        map.put("user", userMap);

        // Remove the password if present
        userMap.remove("password");

        String json = JSON.toString(map);

        response.setStatus(200);
        response.setContentType("application/json");
        response.getWriter().print(json);

        response.getWriter().flush();
        clearAuthenticationAttributes(request);
    }
}
