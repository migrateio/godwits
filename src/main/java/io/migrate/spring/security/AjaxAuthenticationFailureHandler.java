package io.migrate.spring.security;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

public class AjaxAuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    public AjaxAuthenticationFailureHandler() {
        super();
    }

    /**
     * Constructor which sets the <tt>defaultTargetUrl</tt> property of the base class.
     *
     * @param defaultTargetUrl the URL to which the user should be redirected on successful authentication.
     */
    public AjaxAuthenticationFailureHandler(final String defaultTargetUrl) {
        super(defaultTargetUrl);
    }

    /**
     * Writes a simple text string to the response to let the caller know that authentication
     * was not successful.
     */
    @Override
    public void onAuthenticationFailure(final HttpServletRequest request, final HttpServletResponse response, final AuthenticationException exception) throws IOException, ServletException {

        if(exception instanceof LockedException) {
            response.getWriter().print("AUTH_INACTIVE");
        } else if(exception instanceof BadCredentialsException) {
            response.getWriter().print("AUTH_BAD_CREDENTIALS");
        } else {
            response.getWriter().print("AUTH_FAIL");
        }

        response.getWriter().flush();
    }

}
