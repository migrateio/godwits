/**
 * Copyright (c) 2010, Pykl Studios <admin@pykl.com>, All rights reserved.
 */
package io.migrate.spring.security;

import com.amazonaws.AmazonClientException;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.services.simpledb.AmazonSimpleDBClient;
import com.amazonaws.services.simpledb.model.Attribute;
import com.amazonaws.services.simpledb.model.Item;
import com.amazonaws.services.simpledb.model.SelectRequest;
import com.amazonaws.services.simpledb.model.SelectResult;
import org.eclipse.jetty.util.ajax.JSON;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataRetrievalFailureException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.List;
import java.util.Map;

public class MigrateUserDetailsService implements UserDetailsService {

    private static final Logger LOG = LoggerFactory.getLogger(MigrateUserDetailsService.class);

    private String _select;
    private String _awsAccess;
    private String _awsSecret;
    private AmazonSimpleDBClient _client;

    public MigrateUserDetailsService() {
    }

    private AmazonSimpleDBClient getClient() {
        if (_client == null) {
            BasicAWSCredentials credentials = new BasicAWSCredentials(_awsAccess, _awsSecret);
            _client = new AmazonSimpleDBClient(credentials);
        }
        return _client;
    }

    /**
     * Locates the user based on the username. In the actual implementation, the search
     * may possibly be case insensitive, or case insensitive depending on how the
     * implementation instance is configured. In this case, the <code>UserDetails</code>
     * object that comes back may have a username that is of a different case than what
     * was actually requested..
     *
     * @param username the username identifying the user whose data is required.
     * @return a fully populated user record (never <code>null</code>)
     * @throws UsernameNotFoundException if the user could not be found or the user has
     *                                   no GrantedAuthority
     */
    public UserDetails loadUserByUsername(String username)
            throws UsernameNotFoundException, DataAccessException {
        LOG.debug("Fetching user profile for authentication [{}]", username);

        try {
            String select = _select.replace("{username}", username);
            SelectRequest request = new SelectRequest()
                    .withSelectExpression(select)
                    .withConsistentRead(true);
            SelectResult result = getClient().select(request);

            List<Item> items = result.getItems();

            if (items.size() == 0) {
                throw new UsernameNotFoundException("Authentication Failed");
            } else if (items.size() == 1) {
                List<Attribute> attributes = items.get(0).getAttributes();
                for (Attribute attribute : attributes) {
                    if (attribute.getName().equals("_value")) {
                        LOG.debug("Retrieved user: {}", attribute.getValue());
                        final Object json = JSON.parse(attribute.getValue());
                        if (json instanceof Map) {
                            final Map user = (Map) json;
                            return new MigrateUser(user);
                        }
                    }
                }
            }

            LOG.warn("Retrieved too many responses for [{}]", username);
            throw new DataRetrievalFailureException(
                    "Received too many responses for " + username);

        } catch (AmazonClientException e) {
            LOG.warn("Unexpected error while getting user details for " + username, e);
            throw new DataRetrievalFailureException(
                    "Unexpected error while getting user details for " + username, e);
        }
    }

    public void setSelect(String select) {
        _select = select;
    }

    public void setAwsAccess(String awsAccess) {
        _awsAccess = awsAccess;
    }

    public void setAwsSecret(String awsSecret) {
        _awsSecret = awsSecret;
    }
}
