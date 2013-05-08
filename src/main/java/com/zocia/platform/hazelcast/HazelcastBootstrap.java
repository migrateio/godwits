/**
 * Copyright (c) 2010, Pykl Studios <admin@pykl.com>, All rights reserved.
 */
package com.zocia.platform.hazelcast;

import com.hazelcast.config.Config;
import com.hazelcast.config.MapConfig;
import com.hazelcast.config.XmlConfigBuilder;
import com.hazelcast.core.Hazelcast;
import com.hazelcast.core.HazelcastInstance;
import com.hazelcast.core.Member;
import com.zocia.platform.hazelcast.persistence.DelegatingMapStoreFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.InetAddress;
import java.util.Map;
import java.util.Set;

public class HazelcastBootstrap {

    private static final Logger LOG = LoggerFactory.getLogger(HazelcastBootstrap.class);

    private HazelcastInstance _hazelcast;
    private DelegatingMapStoreFactory _mapStoreFactory;

    // Constructors ----------------------------------------------------------------

    public HazelcastBootstrap() {
    }

    // Properties ------------------------------------------------------------------

    public void setMapStoreFactory(DelegatingMapStoreFactory mapStoreFactory) {
        _mapStoreFactory = mapStoreFactory;
    }

    public DelegatingMapStoreFactory getMapStoreFactory() {
        return _mapStoreFactory;
    }

    // Publics ---------------------------------------------------------------------

    public void init() throws Exception {
        if (LOG.isInfoEnabled()) {
            LOG.info("----------------------------------------");
            LOG.info("Starting Hazelcast bootstrap process");
        }

        final Config config = new XmlConfigBuilder().build();
        addMapStoreFactory(config, _mapStoreFactory);
        _hazelcast = Hazelcast.init(config);


        if (LOG.isInfoEnabled()) {
            final StringBuilder sb = new StringBuilder();
            final Set<Member> members = _hazelcast.getCluster().getMembers();
            for (Member member : members) {
                final InetAddress address = member.getInetAddress();
                sb.append(address.toString()).append(", ");
            }
            if (members.size() > 0) {
                sb.setLength(sb.length() - 2);
            } else {
                sb.append("No members identified.");
            }

            LOG.info(String.format(
                    "Hazelcast node [%s] joined the cluster. Members: %s",
                    _hazelcast.getName(), sb.toString()
            ));
            LOG.info("Hazelcast bootstrap process completed");
            LOG.info("----------------------------------------");
        }
    }

    public void destroy() {
        LOG.info("Stopping Hazelcast services");
        Hazelcast.shutdownAll();
        LOG.info("Hazelcast services stopped");
    }

    public HazelcastInstance getHazelcast() {
        return _hazelcast;
    }

    // Protecteds ------------------------------------------------------------------

    protected void addMapStoreFactory(Config config, DelegatingMapStoreFactory factory) {
        if (factory == null) return;

        Map<String, MapConfig> mapConfigs = config.getMapConfigs();
        for (Map.Entry<String, MapConfig> entry : mapConfigs.entrySet()) {
            if (entry.getValue().getMapStoreConfig() != null)
                entry.getValue().getMapStoreConfig().setFactoryImplementation(factory);
        }
    }

}
