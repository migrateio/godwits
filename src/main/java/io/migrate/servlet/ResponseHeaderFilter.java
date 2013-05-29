package io.migrate.servlet;

import org.eclipse.jetty.http.HttpMethods;

import javax.servlet.*;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.HashSet;
import java.util.Set;
import java.util.StringTokenizer;

/**
 * A quick filter which will add Cache-Control header to certain outbound requests.
 */
public class ResponseHeaderFilter implements Filter {

    Set<String> _mimeTypes;
    ServletContext _context;
    String _cacheControl;
    long _timeout;


    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        _context = filterConfig.getServletContext();

        _timeout = 86400;
        String tmp = filterConfig.getInitParameter("timeout");
        if (tmp != null) _timeout = Integer.parseInt(tmp);

        tmp = filterConfig.getInitParameter("mimeTypes");
        if (tmp != null) {
            _mimeTypes = new HashSet<String>();
            StringTokenizer tok = new StringTokenizer(tmp, ", \n\t\r", false);
            while (tok.hasMoreTokens())
                _mimeTypes.add(tok.nextToken());
        }

        _cacheControl = "public, max-age=" + _timeout;
    }

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {

        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;

        // If not a GET then bail
        if (!HttpMethods.GET.equalsIgnoreCase(request.getMethod())) {
            chain.doFilter(request, response);
            return;
        }

        // If not one of our mime types then bail
        if (_mimeTypes != null && _mimeTypes.size() > 0) {
            String mimeType = _context.getMimeType(request.getRequestURI());
            if (mimeType != null && !_mimeTypes.contains(mimeType)) {
                chain.doFilter(request, response);
                return;
            }
        }

        // Add a response header for the indicated duration
        long now = System.currentTimeMillis();
        response.setHeader("Cache-Control", "public");
//        response.setHeader("Cache-Control", _cacheControl);
        if (_timeout > 0)
            response.setDateHeader("Expires", now + _timeout * 1000);
        else
            response.setIntHeader("Expires", -1);

        chain.doFilter(request, response);
    }

    @Override
    public void destroy() {

    }
}
