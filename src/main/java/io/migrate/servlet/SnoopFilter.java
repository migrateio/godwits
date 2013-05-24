package io.migrate.servlet;

/* $Id$
 *
 */
/*
 *  Copyright 1999-2004 The Apache Software Foundation
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.*;
import javax.servlet.http.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.*;


public class SnoopFilter implements Filter {

    private static final Logger LOG = LoggerFactory.getLogger(SnoopFilter.class);

    private boolean logRequestParams;
    private boolean logSessionParams;
    private boolean logCookies;
    private boolean logMiscInfo;
    private boolean initError;

    private FilterConfig filterConfigObj = null;

    public void init(FilterConfig config) throws ServletException {
        this.filterConfigObj = config;
        this.initError = false;

        String param1 = config.getInitParameter("logRequestParams");
        String param2 = config.getInitParameter("logSessionParams");
        String param3 = config.getInitParameter("logCookies");
        String param4 = config.getInitParameter("logMiscInfo");

        if (param1 == null) param1 = "true";
        if (param2 == null) param2 = "true";
        if (param3 == null) param3 = "true";
        if (param4 == null) param4 = "true";

        this.logRequestParams = Boolean.parseBoolean(param1);
        this.logSessionParams = Boolean.parseBoolean(param2);
        this.logCookies = Boolean.parseBoolean(param3);
        this.logMiscInfo = Boolean.parseBoolean(param4);
    }


    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {

        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;

        if (!initError) {
            StringBuilder textMessage = new StringBuilder("\n**************************\n");
            textMessage.append("Logging Filter - Request IP: " + request.getRemoteAddr()).append("\n");
            textMessage.append("Request: " + request.getRequestURL().toString()).append("\n");

            if (this.logRequestParams) {
                textMessage.append(showRequestParameters(request));
            }


            if (this.logSessionParams) {
                textMessage.append(showSessionAttributes(request));
            }


            if (this.logCookies) {
                textMessage.append(showCookies(request));
            }

            if (this.logMiscInfo) {
                textMessage.append(showRequestMiscInfo(request));
            }

            LOG.debug(textMessage.toString());

        } else {
            StringBuilder errorText = new StringBuilder();
            errorText.append("Logging Filter: Couldn't log message due to init errors!").append("\n");
            LOG.debug(errorText.toString());
        }

        chain.doFilter(request, new Wrapper(request, response));
    }
    
     


    public void destroy() {
    }


    private StringBuilder showRequestParameters(HttpServletRequest request) {

        Map<String, String[]> params = request.getParameterMap();
        Iterator<String> i = params.keySet().iterator();
        int count = 0;

        StringBuilder text = new StringBuilder();
        text.append("Request parameters").append("\n");

        if (!i.hasNext()) {
            text.append("No parameters found!").append("\n");
            return text;
        }

        //Look through Map data using Iterator
        while (i.hasNext()) {
            String key = i.next();
            String value = params.get(key)[0];
            text.append("Parameter [" + count + "]: " + key + "  Value: " + value).append("\n");
            count++;
        }

        return text;
    }


    private StringBuilder showSessionAttributes(HttpServletRequest request) {
        HttpSession session = request.getSession(false);

        StringBuilder text = new StringBuilder();
        text.append("Session attributes");

        if (session == null) {
            text.append("No session found!");
            return text;
        }

        ArrayList<String> list = Collections.list(session.getAttributeNames());

        int count = 0;
        text.append("Session ID: " + session.getId()).append("\n");
        text.append("Session created on: " + new Date(session.getCreationTime())).append("\n");

        for (String param : list) {
            String value = session.getAttribute(param).toString();
            text.append("Attribute [" + count + "]: " + param + "  Value: " + value).append("\n");
            count++;
        }

        return text;
    }


    private StringBuilder showCookies(HttpServletRequest request) {

        Cookie[] list = request.getCookies();

        StringBuilder text = new StringBuilder();
        text.append("Request cookies").append("\n");

        if (list == null) {
            text.append("No cookies found!").append("\n");
            return text;
        }

        int count = 0;

        for (Cookie c : list) {
            text.append("Cookie [" + count + "]: " + c.getName() + "  Value: " + c.getValue()).append("\n");
            count++;
        }

        return text;
    }


    private StringBuilder showRequestMiscInfo(HttpServletRequest request) {
        StringBuilder text = new StringBuilder();

        text.append("Request misc information & Headers").append("\n");
        text.append("Request Method: " + request.getMethod()).append("\n");
        text.append("Is request secure?: " + request.isSecure()).append("\n");
        text.append("Request Query String: " + request.getQueryString()).append("\n");

        Enumeration<String> eNames = request.getHeaderNames();

        while (eNames.hasMoreElements()) {
            String name = (String) eNames.nextElement();
            String value = request.getHeader(name);

            //Cookie values must be printed with their own method so we exclude that header field
            if (!name.equalsIgnoreCase("cookie")) {
                char[] chars = name.toLowerCase().toCharArray();
                chars[0] = Character.toUpperCase(chars[0]);
                name = String.copyValueOf(chars);
                text.append(name + ":  " + value).append("\n");
            }
        }

        return text;
    }
}

class Wrapper extends HttpServletResponseWrapper {

    private static final Logger LOG = LoggerFactory.getLogger(SnoopFilter.class);

    StringBuilder out;
    boolean dumped = false;

    public Wrapper(HttpServletRequest request, HttpServletResponse response) {
        super(response);
        String uri = request.getRequestURL().toString();
        out = new StringBuilder("\n********************************\n");
        out.append("Response - " + uri).append("\n");
    }

    public void append(String message) {
        if (!dumped)
            out.append(message).append("\n");
        else {
            LOG.debug(message);
        }
    }

    public void dump() {
        LOG.debug(out.toString());
        dumped = true;
        out.setLength(0);
    }

    @Override
    public PrintWriter getWriter() throws IOException {
        dump();
        return super.getWriter();
    }

    @Override
    public ServletOutputStream getOutputStream() throws IOException {
        dump();
        return super.getOutputStream();
    }

    @Override
    public void setContentType(String type) {
        super.setContentType(type);
        append("Content Type: " + type);
    }

    @Override
    public void setContentLength(int len) {
        super.setContentLength(len);
        append("Content Length: " + len);
    }

    @Override
    public void setCharacterEncoding(String charset) {
        super.setCharacterEncoding(charset);
        append("Character encoding: " + charset);
    }

    @Override
    public void setBufferSize(int size) {
        super.setBufferSize(size);
        append("Buffer Size: " + size);
    }

    @Override
    public void setLocale(Locale loc) {
        super.setLocale(loc);
        append("Locale: " + loc);
    }

    @Override
    public void flushBuffer() throws IOException {
        super.flushBuffer();
        append("Flush Buffer");
    }

    @Override
    protected void finalize() throws Throwable {
        super.finalize();
    }

    @Override
    public void addCookie(Cookie cookie) {
        super.addCookie(cookie);
        append("Adding Cookie: Name: " + cookie.getName()
                + ", domain: " + cookie.getDomain()
                + ", path: " + cookie.getPath()
                + ", age: " + cookie.getMaxAge()
                + ", value: " + cookie.getValue());
    }

    @Override
    public void setHeader(String name, String value) {
        super.setHeader(name, value);
        append("Set Header, name: " + name + ", value: " + value);
    }

    @Override
    public void addHeader(String name, String value) {
        super.addHeader(name, value);
        append("Add Header, name: " + name + ", value: " + value);
    }

    @Override
    public void setStatus(int sc) {
        super.setStatus(sc);
        append("Set Status: " + sc);
    }

    @Override
    public void addIntHeader(String name, int value) {
        super.addIntHeader(name, value);
        append("Add Header, name: " + name + ", value: " + value);
    }

    @Override
    public void setIntHeader(String name, int value) {
        super.setIntHeader(name, value);
        append("Set Header, name: " + name + ", value: " + value);
    }

    @Override
    public void addDateHeader(String name, long date) {
        super.addDateHeader(name, date);
        append("Add Header, name: " + name + ", value: " + date);
    }

    @Override
    public void setDateHeader(String name, long date) {
        super.setDateHeader(name, date);
        append("Set Header, name: " + name + ", value: " + date);
    }

    @Override
    public void sendError(int sc) throws IOException {
        super.sendError(sc);
        append("Send Error: " + sc);
    }

    @Override
    public void sendError(int sc, String msg) throws IOException {
        super.sendError(sc, msg);
        append("Send Error: " + sc + ", message: " + msg);
    }

    @Override
    public void sendRedirect(String location) throws IOException {
        super.sendRedirect(location);
        append("Send Redirect: " + location);
    }
}